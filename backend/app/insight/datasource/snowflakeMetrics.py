import datetime
from typing import Dict, List, Tuple

import pandas as pd
import simplejson

from app.data_source.datasource.snowflakeSource import SnowflakeSource, SnowflakeCredentials
from app.insight.services.metrics import (Dimension, DimensionSliceInfo,
                                          DimensionValuePair, Metric,
                                          NpEncoder, PeriodValue, calculateTotalSegments, find_key_dimensions, NpEncoderForSimpleJson)
from dataclasses import asdict
from loguru import logger

SUB_QUERY_TEMPLATE = """
SELECT
  count(*) as "_cnt",
  {},
  {}
FROM
  TABLE('{}')
WHERE {} BETWEEN TO_TIMESTAMP('{}') AND TO_TIMESTAMP('{}')
GROUP BY
  {}
HAVING {} > {}
"""

METRIC_BY_DATE = """
SELECT
  {},
  DATE({}) as "day"
FROM
  TABLE('{}')
WHERE {} BETWEEN TO_TIMESTAMP('{}') AND TO_TIMESTAMP('{}')
GROUP BY "day"
ORDER BY "day"
"""

JOIN_TEMPLATE = """
SELECT {},
{}
FROM comparison FULL OUTER JOIN baseline ON
{}
"""

QUERY_TEMPLATE = """
WITH baseline AS ({}),
comparison AS ({}),
joined AS ({}),
filtered_changes AS (
 SELECT
    PERCENTILE_CONT(0.2) WITHIN GROUP (ORDER BY "change_percentage") AS "change_percentile_20",
    PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY "change_percentage") AS "change_percentile_80"
  FROM joined
),
std AS (
  SELECT STDDEV("change_percentage") AS "std"
  FROM joined
  WHERE "change_percentage" >= (SELECT "change_percentile_20" FROM filtered_changes)
    AND "change_percentage" <= (SELECT "change_percentile_80" FROM filtered_changes)
)

SELECT *,
joined."change_percentage" / IFF(std."std" = 0, 0.0001, std."std") AS "z_score"
FROM joined CROSS JOIN std
ORDER BY
    IFF("count_all_values" = {}, 1, 0) DESC,
    ABS("z_score") DESC
LIMIT 30000
"""


class SnowflakeMetrics:
    def __init__(self,
                 table_name: str,
                 baseline_period: Tuple[datetime.date, datetime.date],
                 comparison_period: Tuple[datetime.date, datetime.date],
                 date_column,
                 date_column_type,
                 agg_method: Dict[str, str],
                 metrics_name: Dict[str, str],
                 columns: List[str],
                 credentials: SnowflakeCredentials,
                 expected_value: float = 0,
                 ) -> None:
        self.table_name = table_name
        self.baseline_period = baseline_period
        self.comparison_period = comparison_period
        self.date_column = date_column
        self.date_column_converted = f'IFF("{date_column}" > 1924991999999, TIMESTAMP_MICROS("{date_column}"), IFF("{date_column}" > 1924991999, TIMESTAMP_MILLIS("{date_column}"), TIMESTAMP_SECONDS("{date_column}")))' \
            if date_column_type == "INTEGER" else f'TO_TIMESTAMP("{date_column}")'
        self.agg_method = agg_method
        self.metrics_name = metrics_name
        self.columns = columns
        self.snowflake_source = SnowflakeSource(credentials)
        self.column_types = {}
        self.expected_value = expected_value

    def _get_agg(self) -> List[str]:
        agg = []
        for k, v in self.agg_method.items():
            if v == 'sum':
                agg.append(f'SUM({k}) AS "{k}"')
            elif v == 'nunique':
                agg.append(f'COUNT(DISTINCT {k}) AS "{k}"')
            elif v == 'count':
                agg.append(f'COUNT({k}) AS "{k}"')
            else:
                raise Exception(f'Invalid aggregation method {v} for {k}')
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
            map(lambda x: f'GROUPING("{x}")', self.columns))
        joined_column_value_all_count = 'COALESCE(' + '+'.join(map(lambda x: f"IFF(comparison.{x}='ALL', 1, 0)", self.columns)) + ',' + '+'.join(
            map(lambda x: f"IFF(baseline.{x}='ALL', 1, 0)", self.columns)) + ') AS "count_all_values"'
        agg = self._get_agg()
        metric_column = [k for k, v in self.agg_method.items()]

        columns_to_select = [
            f'IFF(GROUPING("{x}") = 1, \'ALL\', CAST("{x}" AS STRING)) AS "{x}"' for x in groupby_columns
        ]
        baseline_query = SUB_QUERY_TEMPLATE.format(
            ',\n'.join(columns_to_select),
            ',\n'.join(agg),
            self.table_name,
            self.date_column_converted,
            self.baseline_period[0],
            self.baseline_period[1] + datetime.timedelta(days=1),
            'CUBE(' + ','.join(self.columns) + ')',
            column_value_all_count,
            len(columns_to_select) - 3  # group by up to 4 dimensions
        )

        comparison_query = SUB_QUERY_TEMPLATE.format(
            ',\n'.join(columns_to_select),
            ',\n'.join(agg),
            self.table_name,
            self.date_column_converted,
            self.comparison_period[0],
            self.comparison_period[1] + datetime.timedelta(days=1),
            'CUBE(' + ','.join(self.columns) + ')',
            column_value_all_count,
            len(columns_to_select) - 3  # group by up to 4 dimensions
        )

        # TODO: Add support for other types, like int
        select_values = [
                            f'COALESCE(comparison."{x}", baseline."{x}") AS "{x}"' for x in groupby_columns
                        ] + [
                            f'COALESCE(comparison."{x}", 0) AS "{x}_comparison"' for x in metric_column
                        ] + [
                            f'COALESCE(baseline."{x}", 0) AS "{x}_baseline"' for x in metric_column
                        ] + [
                            f'COALESCE(comparison."{x}", 0) - COALESCE(baseline."{x}", 0) AS "{x}_diff"' for x in metric_column
                        ] + [
                            f'"{metric_column[0]}_diff" / IFF("{metric_column[0]}_baseline" = 0, IFF("{metric_column[0]}_comparison" > 0, 1, -1),' +
                            f' "{metric_column[0]}_baseline") AS "change_percentage"'
                        ] + [
                            f'ABS(COALESCE(comparison."{x}", 0) - COALESCE(baseline."{x}", 0)) AS "{x}_abs_diff"' for x in metric_column
                        ] + [
                            'COALESCE(comparison."_cnt", 0) AS "_cnt_comparison"',
                            'COALESCE(baseline."_cnt", 0) AS "_cnt_baseline"',
                        ]

        join_clause = [
            f'comparison."{x}" = baseline."{x}"' for x in groupby_columns
        ]

        join_query = JOIN_TEMPLATE.format(
            ',\n'.join(select_values),
            joined_column_value_all_count,
            ' AND '.join(join_clause))

        query = QUERY_TEMPLATE.format(
            baseline_query,
            comparison_query,
            join_query,
            len(columns_to_select) - 1
        )
        return query

    def _get_dimensions(self, df: pd.DataFrame) -> Dict[str, Dimension]:
        dimensions = {}
        for column in self.columns:
            values = list(df[column].unique())
            if None in values:
                values.remove(None)
            dimensions[column] = Dimension(name=column, values=values)
        return dimensions

    def _get_dimension_slice_info(self, df: pd.DataFrame, metric_name: str, baseline_num_rows: int, comparison_num_rows: int) -> List[DimensionSliceInfo]:
        def mapToObj(_, row):
            key = tuple(
                [DimensionValuePair(self.columns[i], str(row[self.columns[i]]))
                 for i in range(len(self.columns))
                 if row[self.columns[i]] != 'ALL'])
            if len(key) == 0:
                return DimensionSliceInfo()
            sorted_key = sorted(key, key=lambda x: x.dimension)
            serialized_key = '|'.join(
                [f'{value_pair.dimension}:{value_pair.value}' for value_pair in sorted_key])

            current_period_value = PeriodValue(
                row['_cnt_comparison'], row['_cnt_comparison'] / comparison_num_rows, row[metric_name + "_comparison"])
            last_period_value = PeriodValue(
                row['_cnt_baseline'], row['_cnt_baseline'] / baseline_num_rows, row[metric_name + "_baseline"])
            return DimensionSliceInfo(
                key,
                serialized_key,
                [],
                last_period_value,
                current_period_value,
                current_period_value.sliceValue - last_period_value.sliceValue,
                row['change_percentage'],
                abs((float(row['change_percentage']) - self.expected_value) / row['std'])
            )

        ret = df.apply(
            lambda row: mapToObj(row.name, row), axis=1).tolist()
        ret = list(filter(lambda x: x.serializedKey is not None, ret))
        ret.sort(key=lambda x: abs(x.impact), reverse=True)
        return ret

    def build_metrics(self,
                      metric_name: str,
                      df: pd.DataFrame,
                      value_by_date_df: pd.DataFrame) -> Metric:
        metric = Metric()
        metric.name = self.metrics_name[metric_name]
        metric.keyDimensions = self.find_key_dimensions(df)
        metric.dimensions = self._get_dimensions(df)
        metric.totalSegments = calculateTotalSegments(metric.dimensions)

        metric.baselineNumRows = df['_cnt_baseline'].max()
        metric.comparisonNumRows = df['_cnt_comparison'].max()

        metric.baselineValue = df[metric_name + '_baseline'].max()
        metric.comparisonValue = df[metric_name + '_comparison'].max()

        all_dimension_slices = self._get_dimension_slice_info(
            df, metric_name, metric.baselineNumRows, metric.comparisonNumRows)

        logger.info('Building top driver slice keys')

        slices_suitable_for_top_slices = [
            dimension_slice for dimension_slice in all_dimension_slices
            if set(map(lambda key: key.dimension, dimension_slice.key)).issubset(set(metric.keyDimensions))
        ]
        metric.topDriverSliceKeys = list(map(
            lambda slice: slice.serializedKey,
            [dimension_slice for dimension_slice in slices_suitable_for_top_slices[:1000]]))
        metric.dimensionSliceInfo = {dimension_slice.serializedKey: dimension_slice
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

        metric.baselineValueByDate = [
            {
                "date": row['day'].strftime('%Y-%m-%d'),
                "value": row[metric_name]
            }
            for _, row in baseline_by_day.iterrows()
        ]
        metric.comparisonValueByDate = [
            {
                "date": row['day'].strftime('%Y-%m-%d'),
                "value": row[metric_name]
            }
            for _, row in comparison_by_day.iterrows()
        ]
        metric.baselineDateRange = [
            self.baseline_period[0].strftime('%Y-%m-%d'),
            self.baseline_period[1].strftime('%Y-%m-%d')
        ]
        metric.comparisonDateRange = [
            self.comparison_period[0].strftime('%Y-%m-%d'),
            self.comparison_period[1].strftime('%Y-%m-%d')
        ]

        metric.expectedChangePercentage = 0
        metric.aggregationMethod = self.agg_method[metric_name]

        return metric

    def find_key_dimensions(self, df: pd.DataFrame) -> List[str]:
        metric_name = next(iter(self.agg_method.keys()))
        single_dimension_df = df[df.apply(lambda row: (row == 'ALL').sum() == len(self.columns) - 1, axis=1)]

        print(single_dimension_df)

        single_dimension_df['dimension_value'] = single_dimension_df.apply(lambda row: row[row.index[0] in self.columns and row != 'ALL'][0], axis=1)
        single_dimension_df['dimension_name'] = single_dimension_df.apply(lambda row: row[row.index[0] in self.columns and row != 'ALL'].index[0], axis=1)
        single_dimension_df['metric_value_comparison'] = single_dimension_df[f"{metric_name}_comparison"]
        single_dimension_df['metric_value_baseline'] = single_dimension_df[f"{metric_name}_baseline"]

        return find_key_dimensions(
            single_dimension_df.loc[:, ['dimension_name', 'dimension_value', 'metric_value_comparison', 'metric_value_baseline']])

    def get_metrics(self):
        """
        Get the metrics of the self.columns
        """
        query = self._prepare_query()
        cur = self.snowflake_source.run_query(query)
        result = pd.DataFrame(cur.fetchall(), columns=[header[0] for header in cur.description])

        value_by_date_query = self._prepare_value_by_date_query()
        cur = self.snowflake_source.run_query(
            value_by_date_query)
        value_by_date_result = pd.DataFrame(cur.fetchall(), columns=[header[0] for header in cur.description])

        ret = {
            k: asdict(self.build_metrics(k, result, value_by_date_result))
            for k in self.metrics_name.keys()
            if k != self.date_column
        }

        return simplejson.dumps(ret, cls=NpEncoderForSimpleJson, allow_nan=False, use_decimal=True)
