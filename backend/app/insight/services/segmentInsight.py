from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, Tuple

import polars as pl

from app.insight.services.metrics import ValueByDate, build_polars_agg


@dataclass
class TimeSeriesInsight:
    name: str = None
    baselineValueByDate: list[ValueByDate] = None
    comparisonValueByDate: list[ValueByDate] = None


def get_segment_insight(
        df: pl.DataFrame,
        date_column: str,
        baseline_date_range: Tuple[datetime.date, datetime.date],
        comparison_date_range: Tuple[datetime.date, datetime.date],
        agg_method: Dict[str, str],
        metric_names: Dict[str, str]
):
    agg_method = [build_polars_agg(name, method) for name, method in agg_method.items()]
    baseline = df.filter(pl.col('date').is_between(
        pl.lit(baseline_date_range[0]),
        pl.lit(baseline_date_range[1])
    )).groupby('date').agg(agg_method).sort('date').with_columns(pl.col('date').cast(pl.Utf8))

    comparison = df.filter(pl.col('date').is_between(
        pl.lit(comparison_date_range[0]),
        pl.lit(comparison_date_range[1])
    )).groupby('date').agg(agg_method).sort('date').with_columns(pl.col('date').cast(pl.Utf8))

    return [TimeSeriesInsight(
        name=metric_name,
        baselineValueByDate=[
            ValueByDate(
                row['date'],
                row[f'{metric_name}']
            )
            for row in baseline.rows(named=True)
        ],
        comparisonValueByDate=[
            ValueByDate(
                row['date'],
                row[f'{metric_name}']
            )
            for row in comparison.rows(named=True)
        ]
    ) for metric_name in metric_names.keys() if metric_name != date_column]
