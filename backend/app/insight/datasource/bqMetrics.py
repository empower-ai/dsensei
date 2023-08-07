import datetime
from typing import Dict, List, Tuple

from app.data_source.datasource.bigquerySource import BigquerySource
from google.cloud import bigquery

"""
SELECT
  ageGroupDim,
  phoneBrandDim,
  majorOsVersion AS osVersionDim,
  DATE(eventTime) AS day,
  COUNT(DISTINCT userId) AS distinctUsersCount
FROM
  `dsensei.dsensei_demo.demo-large-1B-factor100`,
  UNNEST([ageGroup, -1]) as ageGroupDim,
  UNNEST([phoneBrand, 'ALL']) as phoneBrandDim,
  UNNEST([majorOsVersion, 'ALL']) as osVersionDim
GROUP BY
  ageGroupDim,
  phoneBrandDim,
  osVersionDim,
  day
"""

QUERY_TEMPLATE = """
SELECT
  {},
  DATE({}) AS day,
  {}
FROM
  `{}`,
  {}
GROUP BY
  {},
  day
"""


class BqMetrics():
    def __init__(self,
                 table_name: str,
                 baseline_period: Tuple[datetime.date, datetime.date],
                 comparison_period: Tuple[datetime.date, datetime.date],
                 date_column,
                 agg_method: Dict[str, str],
                 metrics_name: Dict[str, str],
                 columns: List[str]) -> None:
        self.table_name = table_name
        self.baseline_period = baseline_period
        self.comparison_period = comparison_period
        self.date_column = date_column
        self.agg_method = agg_method
        self.metrics_name = metrics_name
        self.columns = columns
        self.client = bigquery.Client()
        self.bqSource = BigquerySource()
        self.column_types = {}

    def _get_column_type(self):
        """
        Get the column type of the self.columns
        """
        schema = self.bqSource.get_schema(self.table_name)
        for field in schema.fields:
            if field.name in self.columns:
                self.column_types[field.name] = field.type

    def get_metrics(self) -> Dict[str, float]:
        """
        Get the metrics of the self.columns
        """
        select_columns = self.columns
        unnest_columns = list(map(
            lambda x: f'UNNEST([{x}, "ALL"]) AS {x}',
            self.columns
        ))
        date_column = self.date_column
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

        print(agg)

        query = QUERY_TEMPLATE.format(
            ',\n'.join(select_columns),
            date_column,
            ',\n'.join(agg),
            self.table_name,
            ',\n'.join(unnest_columns),
            ',\n'.join(select_columns)
        )

        print(query)
        return ''
