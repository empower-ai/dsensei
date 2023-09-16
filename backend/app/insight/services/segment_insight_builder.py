from dataclasses import dataclass
from datetime import datetime
from typing import List, Tuple

import polars as pl

from app.insight.services.metrics import Metric, ValueByDate, flatten, DualColumnMetric, DimensionValuePair, PeriodValue, SegmentInfo, Filter
from app.insight.services.utils import build_base_df, prepare_joined_df, get_filter_expression


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
        metrics: List[Metric],
        filters: list[Filter]):
    df = df.filter(get_filter_expression(filters))
    aggs = flatten([metric.get_aggregation_exprs() for metric in metrics])
    baseline = df.filter(pl.col('date').is_between(
        pl.lit(baseline_date_range[0]),
        pl.lit(baseline_date_range[1])
    )).groupby('date').agg(aggs).sort('date').with_columns(pl.col('date').cast(pl.Utf8))

    comparison = df.filter(pl.col('date').is_between(
        pl.lit(comparison_date_range[0]),
        pl.lit(comparison_date_range[1])
    )).groupby('date').agg(aggs).sort('date').with_columns(pl.col('date').cast(pl.Utf8))

    metrics = metrics + flatten([[metric.numerator_metric, metric.denominator_metric] for metric in metrics if
                                 isinstance(metric, DualColumnMetric)])
    return [TimeSeriesInsight(
        name=metric.get_id(),
        baselineValueByDate=[
            ValueByDate(
                row['date'],
                row[f'{metric.get_id()}']
            )
            for row in baseline.rows(named=True)
        ],
        comparisonValueByDate=[
            ValueByDate(
                row['date'],
                row[f'{metric.get_id()}']
            )
            for row in comparison.rows(named=True)
        ]
    ) for metric in metrics]


def get_related_segments(
        df: pl.DataFrame,
        baseline_date_range: Tuple[datetime.date, datetime.date],
        comparison_date_range: Tuple[datetime.date, datetime.date],
        segment_key: list[DimensionValuePair],
        metric: Metric,
        filters: list[Filter]
):
    df = df.filter(get_filter_expression(filters))
    dimensions = [segment_key_part.dimension for segment_key_part in segment_key]

    baseline = build_base_df(df, baseline_date_range, dimensions, [metric])
    baseline_count = baseline.select(pl.col("count").sum()).row(0)[0]

    comparison = build_base_df(df, comparison_date_range, dimensions, [metric])
    comparison_count = comparison.select(pl.col("count").sum()).row(0)[0]

    joined = prepare_joined_df(baseline, comparison, dimensions, [metric])

    if isinstance(metric, DualColumnMetric):
        return {
            metric.get_id(): [map_to_segment_info(row, baseline_count, comparison_count, metric) for row in joined.rows(named=True)],
            metric.numerator_metric.get_id(): [map_to_segment_info(row, baseline_count, comparison_count, metric.numerator_metric) for row in
                                               joined.rows(named=True)],
            metric.denominator_metric.get_id(): [map_to_segment_info(row, baseline_count, comparison_count, metric.denominator_metric) for row in
                                                 joined.rows(named=True)],
        }
    else:
        return {
            metric.get_id(): [map_to_segment_info(row, baseline_count, comparison_count, metric) for row in joined.rows(named=True)]
        }


def map_to_segment_info(row, baseline_count: int, comparison_count: int, metric: Metric):
    values = row["dimension_value"]
    dimensions = row['dimension_name']
    key = tuple([DimensionValuePair(dimensions[i], str(values[i]))
                 for i in range(len(dimensions))])
    serialized_key = row['serialized_key']

    current_period_value = PeriodValue(
        row['count'], row['count'] / comparison_count, row[metric.get_id()])
    last_period_value = PeriodValue(
        row['count_baseline'], row['count_baseline'] / baseline_count,
        row[f'{metric.get_id()}_baseline'])
    change = 1 if last_period_value.sliceValue == 0 else (current_period_value.sliceValue - last_period_value.sliceValue) / last_period_value.sliceValue

    return SegmentInfo(
        key,
        serialized_key,
        last_period_value,
        current_period_value,
        current_period_value.sliceValue - last_period_value.sliceValue,
        change,
        None,
        None,
        None
    )
