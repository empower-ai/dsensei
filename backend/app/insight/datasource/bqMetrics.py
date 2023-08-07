import datetime
from typing import Dict, List, Tuple

from app.data_source.datasource.bigquerySource import BigquerySource
from google.cloud import bigquery

SUB_QUERY_TEMPLATE = """
SELECT
  {},
  {}
FROM
  `{}`,
  {}
WHERE {} BETWEEN TIMESTAMP('{}') AND TIMESTAMP('{}')
GROUP BY
  {}
"""

QUERY_TEMPLATE = """
WITH baseline AS ({}),
comparison AS ({})
SELECT {}
FROM comparison FULL OUTER JOIN BASELINE ON
{}
ORDER BY {} DESC
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
        groupby_columns = self.columns
        unnest_columns = list(map(
            lambda x: f'UNNEST([{x}, "ALL"]) AS {x}',
            self.columns
        ))
        date_column = self.date_column
        agg = []
        metric_column = [k for k, v in self.agg_method.items()]
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
        ]

        join_clause = [
            f'comparison.{x} = baseline.{x}' for x in groupby_columns
        ]

        query = QUERY_TEMPLATE.format(
            baseline_query,
            comparison_query,
            ',\n'.join(select_values),
            ' AND '.join(join_clause),
            ',\n'.join([f'{x}_abs_diff' for x in metric_column])
        )

        print(query)
        return ''
