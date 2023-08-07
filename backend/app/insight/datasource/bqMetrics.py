import datetime
import json
from dataclasses import asdict
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from app.data_source.datasource.bigquerySource import BigquerySource
from app.insight.services.metrics import (Dimension, DimensionSliceInfo,
                                          DimensionValuePair, Metric,
                                          NpEncoder, PeriodValue)
from google.cloud import bigquery
from loguru import logger

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
"""

METRIC_BY_DATE = """
SELECT
  {},
  DATE({}) as day,
FROM
  `{}`
WHERE {} BETWEEN TIMESTAMP('{}') AND TIMESTAMP('{}')
GROUP BY
  day
"""

JOIN_TEMPLATE = """
SELECT {}
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
joined.{}_diff / IF(joined.{}_baseline = 0, 1, joined.{}_baseline) / std.std AS z_score,
joined.{}_diff / IF(joined.{}_baseline = 0, 1, joined.{}_baseline) as change_percentage
FROM joined CROSS JOIN std
ORDER BY ABS(z_score) DESC
LIMIT 10000
"""


class BqMetrics():
    def __init__(self,
                 table_name: str,
                 baseline_period: Tuple[datetime.date, datetime.date],
                 comparison_period: Tuple[datetime.date, datetime.date],
                 date_column,
                 agg_method: Dict[str, str],
                 metrics_name: Dict[str, str],
                 columns: List[str],
                 expected_value: List[float] = 0) -> None:
        self.table_name = table_name
        self.baseline_period = baseline_period
        self.comparison_period = comparison_period
        self.date_column = date_column
        self.agg_method = agg_method
        self.metrics_name = metrics_name
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
        for k, v in self.agg_method.items():
            if v == 'sum':
                agg.append(f'SUM({k}) AS {k}')
            elif v == 'nunique':
                agg.append(f'COUNT(DISTINCT {k}) AS {k}')
            elif v == 'count':
                agg.append(f'COUNT({k}) AS {k}')
            else:
                raise Exception(f'Invalid aggregation method {v} for {k}')
        return agg

    def _prepare_value_by_date_query(self) -> str:
        agg = self._get_agg()

        query = METRIC_BY_DATE.format(
            ',\n'.join(agg),
            self.date_column,
            self.table_name,
            self.date_column,
            self.baseline_period[0],
            self.comparison_period[1])
        return query

    def _prepare_query(self) -> str:
        groupby_columns = self.columns
        unnest_columns = list(map(
            lambda x: f'UNNEST([{x}, "ALL"]) AS {x}',
            self.columns
        ))
        date_column = self.date_column
        agg = self._get_agg()
        metric_column = [k for k, v in self.agg_method.items()]

        baseline_query = SUB_QUERY_TEMPLATE.format(
            ',\n'.join(groupby_columns),
            ',\n'.join(agg),
            self.table_name,
            ',\n'.join(unnest_columns),
            date_column,
            self.baseline_period[0],
            self.baseline_period[1],
            ',\n'.join(groupby_columns)
        )

        comparison_query = SUB_QUERY_TEMPLATE.format(
            ',\n'.join(groupby_columns),
            ',\n'.join(agg),
            self.table_name,
            ',\n'.join(unnest_columns),
            date_column,
            self.comparison_period[0],
            self.comparison_period[1],
            ',\n'.join(groupby_columns)
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
            metric_column[0])
        print(query)
        return query

    def _get_dimensions(self, df: pd.DataFrame) -> Dict[str, Dimension]:
        dimensions = {}
        for column in self.columns:
            values = list(df[column].unique()).remove('ALL')
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
                row['_cnt_comparison'], row['_cnt_comparison'] / comparison_num_rows, row[metric_name + "_baseline"])
            last_period_value = PeriodValue(
                row['_cnt_baseline'], row['_cnt_baseline'] / baseline_num_rows, row[metric_name + "_comparison"])
            return DimensionSliceInfo(key, serialized_key, [], last_period_value, current_period_value, current_period_value.sliceValue - last_period_value.sliceValue, row['change_percentage'], row['z_score'])

        ret = df.apply(
            lambda row: mapToObj(row.name, row), axis=1).tolist()
        return list(filter(lambda x: x.serializedKey is not None, ret))

    def build_metrics(self, metric_name: str, df: pd.DataFrame) -> Metric:
        metric = Metric()
        metric.name = self.metrics_name[metric_name]
        metric.dimensions = self._get_dimensions(df)

        # TODO: fix these two lines
        metric.baselineNumRows = df['_cnt_baseline'].max()
        metric.comparisonNumRows = df['_cnt_comparison'].max()

        all_dimension_slices = self._get_dimension_slice_info(
            df, metric_name, metric.baselineNumRows, metric.comparisonNumRows)

        logger.info('Building top driver slice keys')
        metric.topDriverSliceKeys = list(map(
            lambda slice: slice.serializedKey,
            [dimension_slice for dimension_slice in all_dimension_slices[:1000]]))
        metric.dimensionSliceInfo = {dimension_slice.serializedKey: dimension_slice
                                     for dimension_slice in all_dimension_slices
                                     }
        return metric

    def get_metrics(self) -> Dict[str, float]:
        """
        Get the metrics of the self.columns
        """
        query = self._prepare_query()
        # print(query)
        # return ''
        result = self.client.query(query).to_dataframe()

        ret = {
            k: asdict(self.build_metrics(k, result))
            for k in self.metrics_name.keys()
            if k != self.date_column
        }

        return json.dumps(ret, cls=NpEncoder)
