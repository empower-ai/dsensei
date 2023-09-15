import datetime
import json
from dataclasses import asdict
from typing import Dict, List, Tuple

import pandas as pd
from google.cloud import bigquery
from loguru import logger

from app.data_source.bigquery.bigquery_source import BigquerySource
from app.insight.services.metrics import (Dimension, SegmentInfo,
                                          DimensionValuePair, MetricInsight,
                                          NpEncoder, PeriodValue, calculate_total_segments, find_key_dimensions, Metric, AggregateMethod)

SUB_QUERY_TEMPLATE = """
SELECT
  count(*) as _cnt,
  {},
  {}
FROM
  `{}`,
  {}
WHERE {} BETWEEN TIMESTAMP('{}') AND TIMESTAMP('{}')
GROUP BY
  {}
HAVING {} > {}
"""

METRIC_BY_DATE = """
SELECT
  {},
  DATE({}) as day,
FROM
  `{}`
WHERE {} BETWEEN TIMESTAMP('{}') AND TIMESTAMP('{}')
GROUP BY day
ORDER BY day
"""

JOIN_TEMPLATE = """
SELECT {},
{}
FROM comparison FULL OUTER JOIN baseline ON
{}
"""

STD_TEMPLATE = """
SELECT
    STDDEV(COALESCE((joined.{}_diff / IF(joined.{}_baseline = 0, 1, joined.{}_baseline)), 0.5)) AS std
FROM joined
"""

QUERY_TEMPLATE = """
WITH baseline AS ({}),
comparison AS ({}),
joined AS ({}),
std AS ({})
SELECT *,
joined.{}_diff / IF(joined.{}_baseline = 0, 1, joined.{}_baseline) / IF(std.std = 0, 0.001, std.std) AS z_score,
joined.{}_diff / IF(joined.{}_baseline = 0, 1, joined.{}_baseline) as change_percentage,
FROM joined CROSS JOIN std
ORDER BY
    IF(count_all_values = {}, 1, 0) DESC,
    ABS(z_score) DESC
LIMIT 30000
"""


class BqMetrics():
    def __init__(self,
                 table_name: str,
                 baseline_period: Tuple[datetime.date, datetime.date],
                 comparison_period: Tuple[datetime.date, datetime.date],
                 date_column,
                 date_column_type,
                 metrics: List[Metric],
                 columns: List[str],
                 expected_value: float = 0) -> None:
        self.table_name = table_name
        self.baseline_period = baseline_period
        self.comparison_period = comparison_period
        self.date_column = date_column
        self.date_column_converted = f"IF({date_column} > 1924991999999, TIMESTAMP_MICROS({date_column}), IF({date_column} > 1924991999, TIMESTAMP_MILLIS({date_column}), TIMESTAMP_SECONDS({date_column})))" \
            if date_column_type == "INTEGER" else f"TIMESTAMP({date_column})"
        self.metrics = metrics
        self.columns = columns
        self.client = bigquery.Client()
        self.bq_source = BigquerySource()
        self.column_types = {}
        self.expected_value = expected_value

    def _get_column_type(self):
        """
        Get the column type of the self.columns
        """
        schema = self.bq_source.get_schema(self.table_name)
        for field in schema.fields:
            if field.name in self.columns:
                self.column_types[field.name] = field.type

    def _get_agg(self) -> List[str]:
        agg = []
        for metric in self.metrics:
            if metric.get_metric_type() == AggregateMethod.SUM.name:
                agg.append(f'SUM({metric.column}) AS {metric.get_id()}')
            elif metric.get_metric_type() == AggregateMethod.DISTINCT.name:
                agg.append(f'COUNT(DISTINCT {metric.column}) AS {metric.get_id()}')
            elif metric.get_metric_type() == AggregateMethod.COUNT.name:
                agg.append(f'COUNT({metric.column}) AS {metric.get_id()}')
            else:
                raise Exception(f'Invalid aggregation method {metric.get_metric_type()} for {metric.column}')
        return agg

    def _prepare_value_by_date_query(self) -> str:
        agg = self._get_agg()

        query = METRIC_BY_DATE.format(
            ',\n'.join(agg),
            self.date_column_converted,
            self.table_name,
            self.date_column_converted,
            self.baseline_period[0],
            self.comparison_period[1] + datetime.timedelta(days=1))
        return query

    def _prepare_query(self) -> str:
        groupby_columns = self.columns
        column_value_all_count = '+'.join(
            map(lambda x: f"IF({x}='ALL', 1, 0)", self.columns))
        joined_column_value_all_count = 'COALESCE(' + '+'.join(map(lambda x: f"IF(comparison.{x}='ALL', 1, 0)", self.columns)) + ',' + '+'.join(
            map(lambda x: f"IF(baseline.{x}='ALL', 1, 0)", self.columns)) + ') AS count_all_values'
        unnest_columns = list(map(
            lambda x: f'UNNEST([CAST({x} AS STRING), "ALL"]) AS {x}',
            self.columns
        ))
        date_column = self.date_column
        agg = self._get_agg()
        metric_column = [metric.get_id() for metric in self.metrics]

        columns_to_select = [
            f"CAST({x} AS STRING) AS {x}" for x in groupby_columns
        ]
        baseline_query = SUB_QUERY_TEMPLATE.format(
            ',\n'.join(columns_to_select),
            ',\n'.join(agg),
            self.table_name,
            ',\n'.join(unnest_columns),
            self.date_column_converted,
            self.baseline_period[0],
            self.baseline_period[1] + datetime.timedelta(days=1),
            ',\n'.join(groupby_columns),
            column_value_all_count,
            len(columns_to_select) - 4  # group by up to 4 dimensions
        )

        comparison_query = SUB_QUERY_TEMPLATE.format(
            ',\n'.join(columns_to_select),
            ',\n'.join(agg),
            self.table_name,
            ',\n'.join(unnest_columns),
            self.date_column_converted,
            self.comparison_period[0],
            self.comparison_period[1] + datetime.timedelta(days=1),
            ',\n'.join(groupby_columns),
            column_value_all_count,
            len(columns_to_select) - 4  # group by up to 4 dimensions
        )

        # TODO: Add support for other types, like int
        select_values = [
                            f'COALESCE(comparison.{x}, baseline.{x}) AS {x}' for x in groupby_columns
                        ] + [
                            f'COALESCE(comparison.{x}, 0) AS {x}_comparison' for x in metric_column
                        ] + [
                            f'COALESCE(baseline.{x}, 0) AS {x}_baseline' for x in metric_column
                        ] + [
                            f'COALESCE(comparison.{x}, 0) - COALESCE(baseline.{x}, 0) AS {x}_diff' for x in metric_column
                        ] + [
                            f'ABS(COALESCE(comparison.{x}, 0) - COALESCE(baseline.{x}, 0)) AS {x}_abs_diff' for x in metric_column
                        ] + [
                            'COALESCE(comparison._cnt, 0) AS _cnt_comparison',
                            'COALESCE(baseline._cnt, 0) AS _cnt_baseline',
                        ]

        join_clause = [
            f'comparison.{x} = baseline.{x}' for x in groupby_columns
        ]

        join_query = JOIN_TEMPLATE.format(
            ',\n'.join(select_values),
            joined_column_value_all_count,
            ' AND '.join(join_clause))

        std_query = STD_TEMPLATE.format(
            metric_column[0], metric_column[0], metric_column[0])

        query = QUERY_TEMPLATE.format(
            baseline_query,
            comparison_query,
            join_query,
            std_query,
            metric_column[0],
            metric_column[0],
            metric_column[0],
            metric_column[0],
            metric_column[0],
            metric_column[0],
            len(columns_to_select) - 1
        )
        return query

    def _get_dimensions(self, df: pd.DataFrame) -> Dict[str, Dimension]:
        dimensions = {}
        for column in self.columns:
            values = list(df[column].unique())
            if "ALL" in values:
                values.remove('ALL')
            # TODO
            dimensions[column] = Dimension(name=column, score=0)
        return dimensions

    def _get_dimension_slice_info(self, df: pd.DataFrame, metric_name: str, baseline_num_rows: int, comparison_num_rows: int) -> List[SegmentInfo]:
        def mapToObj(_, row):
            key = tuple(
                [DimensionValuePair(self.columns[i], str(row[self.columns[i]]))
                 for i in range(len(self.columns))
                 if row[self.columns[i]] != 'ALL'])
            if len(key) == 0:
                return SegmentInfo()
            sorted_key = sorted(key, key=lambda x: x.dimension)
            serialized_key = '|'.join(
                [f'{value_pair.dimension}:{value_pair.value}' for value_pair in sorted_key])

            current_period_value = PeriodValue(
                row['_cnt_comparison'], row['_cnt_comparison'] / comparison_num_rows, row[metric_name + "_comparison"])
            last_period_value = PeriodValue(
                row['_cnt_baseline'], row['_cnt_baseline'] / baseline_num_rows, row[metric_name + "_baseline"])
            return SegmentInfo(
                key,
                serialized_key, last_period_value, current_period_value,
                current_period_value.sliceValue - last_period_value.sliceValue, row['change_percentage'], row['z_score'])

        ret = df.apply(
            lambda row: mapToObj(row.name, row), axis=1).tolist()
        ret = list(filter(lambda x: x.serializedKey is not None, ret))
        ret.sort(key=lambda x: abs(x.impact), reverse=True)
        return ret

    def build_metrics(self,
                      metric: Metric,
                      df: pd.DataFrame,
                      value_by_date_df: pd.DataFrame) -> MetricInsight:
        insight = MetricInsight()
        insight.name = metric.get_display_name()
        insight.keyDimensions = self.find_key_dimensions(df)
        insight.dimensions = self._get_dimensions(df)
        insight.totalSegments = calculate_total_segments(insight.dimensions)

        insight.baselineNumRows = df['_cnt_baseline'].max()
        insight.comparisonNumRows = df['_cnt_comparison'].max()

        insight.baselineValue = df[metric.get_id() + '_baseline'].max()
        insight.comparisonValue = df[metric.get_id() + '_comparison'].max()

        all_dimension_slices = self._get_dimension_slice_info(
            df, metric.get_id(), insight.baselineNumRows, insight.comparisonNumRows)

        logger.info('Building top driver slice keys')

        slices_suitable_for_top_slices = [
            dimension_slice for dimension_slice in all_dimension_slices
            if set(map(lambda key: key.dimension, dimension_slice.key)).issubset(set(insight.keyDimensions))
        ]
        insight.topDriverSliceKeys = list(map(
            lambda slice: slice.serializedKey,
            [dimension_slice for dimension_slice in slices_suitable_for_top_slices[:1000]]))
        insight.dimensionSliceInfo = {dimension_slice.serializedKey: dimension_slice
                                      for dimension_slice in all_dimension_slices
                                      }

        baseline_by_day = value_by_date_df.loc[
            value_by_date_df['day'].between(
                self.baseline_period[0], self.baseline_period[1] + datetime.timedelta(days=1))
        ]
        comparison_by_day = value_by_date_df.loc[
            value_by_date_df['day'].between(
                self.comparison_period[0], self.comparison_period[1] + datetime.timedelta(days=1))
        ]

        insight.baselineValueByDate = [
            {
                "date": row['day'].strftime('%Y-%m-%d'),
                "value": row[metric.get_id()]
            }
            for _, row in baseline_by_day.iterrows()
        ]
        insight.comparisonValueByDate = [
            {
                "date": row['day'].strftime('%Y-%m-%d'),
                "value": row[metric.get_id()]
            }
            for _, row in comparison_by_day.iterrows()
        ]
        insight.baselineDateRange = [
            self.baseline_period[0].strftime('%Y-%m-%d'),
            self.baseline_period[1].strftime('%Y-%m-%d')
        ]
        insight.comparisonDateRange = [
            self.comparison_period[0].strftime('%Y-%m-%d'),
            self.comparison_period[1].strftime('%Y-%m-%d')
        ]

        insight.expectedChangePercentage = 0
        insight.aggregationMethod = metric.get_metric_type()

        return insight

    def find_key_dimensions(self, df: pd.DataFrame) -> List[str]:
        metric_name = self.metrics[0].get_id()
        single_dimension_df = df[df.apply(lambda row: (row == 'ALL').sum() == len(self.columns) - 1, axis=1)]
        single_dimension_df['dimension_value'] = single_dimension_df.apply(lambda row: row[row.index[0] in self.columns and row != 'ALL'][0], axis=1)
        single_dimension_df['dimension_name'] = single_dimension_df.apply(lambda row: row[row.index[0] in self.columns and row != 'ALL'].index[0], axis=1)
        single_dimension_df['metric_value_comparison'] = single_dimension_df[f"{metric_name}_comparison"]
        single_dimension_df['metric_value_baseline'] = single_dimension_df[f"{metric_name}_baseline"]

        return find_key_dimensions(
            single_dimension_df.loc[:, ['dimension_name', 'dimension_value', 'metric_value_comparison', 'metric_value_baseline']])

    def get_metrics(self) -> Dict[str, float]:
        """
        Get the metrics of the self.columns
        """
        query = self._prepare_query()
        result = self.client.query(query).to_dataframe()

        value_by_date_query = self._prepare_value_by_date_query()
        value_by_date_result = self.client.query(
            value_by_date_query).to_dataframe()

        ret = {
            metric.get_id(): asdict(self.build_metrics(metric, result, value_by_date_result))
            for metric in self.metrics
        }

        return json.dumps(ret, cls=NpEncoder, allow_nan=False)
