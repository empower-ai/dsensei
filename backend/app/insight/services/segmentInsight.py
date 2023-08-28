from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Tuple

import pandas as pd
import polars

from app.insight.services.metrics import ValueByDate


@dataclass
class TimeSeriesInsight:
    name: str = None
    baselineValueByDate: list[ValueByDate] = None
    comparisonValueByDate: list[ValueByDate] = None


def get_segment_insight(
        df: pd.DataFrame,
        date_column: str,
        baseline_date_range: Tuple[datetime.date, datetime.date],
        comparison_date_range: Tuple[datetime.date, datetime.date],
        agg_method: Dict[str, str],
        metric_names: Dict[str, str]
) -> TimeSeriesInsight:
    baseline = df.loc[df[date_column].between(
        pd.to_datetime(baseline_date_range[0], utc=True),
        pd.to_datetime(baseline_date_range[1] + pd.DateOffset(1), utc=True))
    ].groupby('date').agg(agg_method)
    comparison = df.loc[df[date_column].between(
        pd.to_datetime(comparison_date_range[0], utc=True),
        pd.to_datetime(comparison_date_range[1] + pd.DateOffset(1), utc=True))
    ].groupby('date').agg(agg_method)

    metricName = next(iter(metric_names.values()))

    return TimeSeriesInsight(
        name=metricName,
        baselineValueByDate=[
            ValueByDate(
                index.strftime("%Y-%m-%d"),
                row[f'{metricName}']
            )
            for index, row in baseline.iterrows()
        ],
        comparisonValueByDate=[
            ValueByDate(
                index.strftime("%Y-%m-%d"),
                row[f'{metricName}']
            )
            for index, row in comparison.iterrows()
        ]
    )
