import datetime
from concurrent.futures import wait
from itertools import combinations
from typing import List, Optional, Tuple

import numpy
import numpy as np
import orjson
import polars as polars
from loguru import logger
from polars import Expr
from scipy import stats

from app.common.errors import EmptyDataFrameError
from app.insight.services.metrics import (Dimension, DimensionValuePair,
                                          DualColumnMetric, Metric,
                                          MetricInsight, PeriodValue,
                                          SegmentInfo, SingleColumnMetric,
                                          flatten, parallel_analysis_executor, Filter)
from app.insight.services.utils import build_aggregation_expressions, get_filter_expression, get_num_rows


class DFBasedInsightBuilder(object):
    def __init__(self,
                 data: polars.DataFrame,
                 baseline_date_range: Tuple[datetime.date, datetime.date],
                 comparison_date_range: Tuple[datetime.date, datetime.date],
                 group_by_columns: List[str],
                 metrics: List[Metric],
                 expected_value: float,
                 filters: list[Filter] = None,
                 ):
        self.df = data
        self.group_by_columns = group_by_columns
        self.group_by_columns.sort()
        self.metrics = metrics

        self.baseline_date_range = baseline_date_range
        self.comparison_date_range = comparison_date_range

        self.expected_value = expected_value

        self.segments_df = polars.DataFrame()
        self.key_dimensions = []
        self.analyzing_metric = self.metrics[0]

        logger.info('init')
        self.df = self.df.filter(get_filter_expression(filters))

        if get_num_rows(self.df) == 0:
            raise EmptyDataFrameError()

        self.baseline_df = self.df.filter(
            polars.col('date').is_between(
                polars.lit(self.baseline_date_range[0]),
                polars.lit(self.baseline_date_range[1])
            )
        )
        self.comparison_df = self.df.filter(
            polars.col('date').is_between(
                polars.lit(self.comparison_date_range[0]),
                polars.lit(self.comparison_date_range[1])
            )
        )
        self.aggregation_expressions = build_aggregation_expressions(self.metrics)
        self.overall_aggregated_df = self.gen_agg_df()

        column_combinations_list = []
        for i in range(1, min(3, len(self.group_by_columns)) + 1):
            column_combinations_list.extend(
                combinations(self.group_by_columns, i))

        baseline_df = self.baseline_df.groupby(self.group_by_columns).agg(self.aggregation_expressions)
        comparison_df = self.comparison_df.groupby(self.group_by_columns).agg(self.aggregation_expressions)

        self.joined_df = comparison_df.join(
            baseline_df,
            on=self.group_by_columns,
            suffix="_baseline",
            how='outer'
        ).fill_null(0).fill_nan(0)
        self.segments_df, self.dimensions, self.total_segments = self.analyze_segments(column_combinations_list)
        self.key_dimensions = [dimension.name for dimension in self.dimensions if dimension.is_key_dimension]
        logger.info('init done')

    def gen_agg_df(self):
        baseline = self.baseline_df.select(self.aggregation_expressions)
        comparison = self.comparison_df.select(self.aggregation_expressions)

        return comparison.join(baseline, suffix='_baseline', how='cross').fill_nan(0).fill_null(0)

    def gen_value_by_date(self, df: polars.DataFrame, metric: Metric):
        aggregated_df = df.groupby('date').agg(metric.get_aggregation_exprs()) \
            .sort('date') \
            .with_columns(polars.col('date').cast(polars.Utf8))

        return [
            {
                "date": row['date'],
                "value": row[metric.get_id()]
            }
            for row in aggregated_df.rows(named=True)
        ]

    def build_metric_insight(self, metric: Metric, parent_metric: Optional[Metric] = None) -> MetricInsight:
        insight = MetricInsight()
        insight.id = metric.get_id()
        insight.name = metric.get_display_name()
        insight.filters = metric.filters if isinstance(
            metric, SingleColumnMetric) else None
        insight.baselineNumRows = self.overall_aggregated_df['count_baseline'].sum()
        insight.comparisonNumRows = self.overall_aggregated_df['count'].sum()
        insight.dimensions = {dimension.name: dimension for dimension in self.dimensions}
        insight.totalSegments = self.total_segments
        insight.keyDimensions = self.key_dimensions

        # Build dimension slice info
        logger.info(f'Building dimension slice info for {metric.get_id()}')

        insight.dimensionSliceInfo, insight.topDriverSliceKeys = self.convert_to_segment_info(
            self.segments_df, metric, insight.baselineNumRows, insight.comparisonNumRows, parent_metric)

        insight.baselineValue = self.overall_aggregated_df[f'{metric.get_id()}_baseline'].sum()
        insight.comparisonValue = self.overall_aggregated_df[metric.get_id()].sum()

        logger.info('Building baseline value by date')

        insight.aggregationMethod = metric.get_metric_type()
        insight.expectedChangePercentage = self.expected_value
        insight.baselineValueByDate = self.gen_value_by_date(
            self.baseline_df, metric)
        insight.comparisonValueByDate = self.gen_value_by_date(
            self.comparison_df, metric)

        insight.baselineDateRange = [self.baseline_date_range[0].strftime(
            "%Y-%m-%d"), self.baseline_date_range[1].strftime("%Y-%m-%d")]
        insight.comparisonDateRange = [self.comparison_date_range[0].strftime(
            "%Y-%m-%d"), self.comparison_date_range[1].strftime("%Y-%m-%d")]

        logger.info('Finished building metrics')

        return insight

    def build(self) -> str:

        metrics_to_build = [(metric, None) for metric in self.metrics] + flatten(
            [[(metric.numerator_metric, metric), (metric.denominator_metric, metric)] for metric in self.metrics if
             isinstance(metric, DualColumnMetric)])
        metric_ids = [metric.get_id() for metric, _ in metrics_to_build]
        logger.info(f'Building metrics for {metric_ids}')
        ret = {
            metric.get_id(): self.build_metric_insight(metric, parent_metric)
            for metric, parent_metric in metrics_to_build
        }

        logger.info(f'Finished building metrics for {metric_ids}')
        ret = orjson.dumps(ret)
        logger.info(f'Finished dumping metrics for {metric_ids}')
        return ret

    def analyze_segments(self, column_combinations_list: List[List[str]]):
        def _safe_divide(n: Expr, m: Expr):
            return polars.when(m == 0).then(0).otherwise(n / m)

        sub_df_agg_methods_alt = flatten([
            ([polars.sum(metric.get_id()), polars.sum(f"{metric.get_id()}_baseline")] if isinstance(metric, SingleColumnMetric) else [
                _safe_divide(polars.sum(metric.numerator_metric.get_id()), polars.sum(metric.denominator_metric.get_id())).alias(metric.get_id()),
                polars.sum(metric.numerator_metric.get_id()).alias(metric.numerator_metric.get_id()),
                polars.sum(metric.denominator_metric.get_id()).alias(metric.denominator_metric.get_id()),

                _safe_divide(polars.sum(f"{metric.numerator_metric.get_id()}_baseline"), polars.sum(f"{metric.denominator_metric.get_id()}_baseline")).alias(
                    f"{metric.get_id()}_baseline"),
                polars.sum(f"{metric.numerator_metric.get_id()}_baseline").alias(f"{metric.numerator_metric.get_id()}_baseline"),
                polars.sum(f"{metric.denominator_metric.get_id()}_baseline").alias(f"{metric.denominator_metric.get_id()}_baseline")
            ])
            for metric in self.metrics
        ]) + [polars.sum("count").alias("count"), polars.sum("count_baseline").alias("count_baseline")]

        def gen_sub_df_for_columns(columns: List[str]):
            joined = self.joined_df \
                .groupby(columns) \
                .agg(sub_df_agg_methods_alt) \
                .with_columns(polars.lit([columns], dtype=polars.List).alias("dimension_name")) \
                .with_columns(polars.concat_list([polars.col(column).cast(str) for column in columns]).alias("dimension_value")) \
                .drop(columns)

            analyzing_metric = next(iter(self.metrics))
            weight_col_name = analyzing_metric.get_weight_column_name()
            weight_sum, baseline_weight_sum = joined.select((polars.col(
                weight_col_name, f"{weight_col_name}_baseline").sum())).row(0)

            joined = joined \
                .with_columns((polars.lit(weight_sum) + polars.lit(baseline_weight_sum)).alias("sum")) \
                .with_columns((polars.col(weight_col_name) + polars.col(f"{weight_col_name}_baseline")).alias("weight"),
                              polars.when(
                                  polars.col(
                                      f"{analyzing_metric.get_id()}_baseline") == 0
                              ).then(
                                  polars.when(
                                      polars.col(analyzing_metric.get_id()) > 0
                                  ).then(polars.lit(1)).otherwise(polars.lit(-1))
                              ).otherwise(
                                  (polars.col(analyzing_metric.get_id()) - polars.col(f"{analyzing_metric.get_id()}_baseline")) / polars.col(
                                      f"{analyzing_metric.get_id()}_baseline")
                              ).alias("change")
                              ) \
                .with_columns((polars.col("change") - polars.lit(self.expected_value)).alias("calibrated_change")) \
                .with_columns((polars.col("weight") * polars.col("calibrated_change")).alias("weighted_change"))

            weighted_change_mean = joined.select(
                polars.col("weighted_change").sum() / polars.col("weight").sum()).row(0)
            weighted_relative_change_std = (joined.select(
                ((polars.col("weight") * (polars.col("change") - polars.lit(weighted_change_mean)).pow(2)).sum() / polars.col("weight").sum()).sqrt()
            )).row(0)
            res = joined.with_columns(polars.lit(weighted_relative_change_std).alias("weighted_relative_change_std"))

            if isinstance(analyzing_metric, SingleColumnMetric):
                sum = self.overall_aggregated_df[analyzing_metric.get_id()].sum()
                sum_baseline = self.overall_aggregated_df[f"{analyzing_metric.get_id()}_baseline"].sum()

                overall_change = _safe_divide(polars.lit(sum) - polars.lit(sum_baseline), polars.lit(sum_baseline))
                overall_change_without_segment = _safe_divide(
                    (polars.lit(sum) - polars.col(analyzing_metric.get_id())) - (
                            polars.lit(sum_baseline) - polars.col(f"{analyzing_metric.get_id()}_baseline")),
                    polars.lit(sum_baseline) - polars.col(f"{analyzing_metric.get_id()}_baseline")
                )

                return res.with_columns((overall_change - overall_change_without_segment).alias("absolute_contribution"))

            elif isinstance(analyzing_metric, DualColumnMetric):
                numerator_id = analyzing_metric.numerator_metric.get_id()
                denominator_id = analyzing_metric.denominator_metric.get_id()

                numerator_sum = self.overall_aggregated_df[numerator_id].sum()
                numerator_sum_baseline = self.overall_aggregated_df[f"{numerator_id}_baseline"].sum()
                denominator_sum = self.overall_aggregated_df[denominator_id].sum()
                denominator_sum_baseline = self.overall_aggregated_df[f"{denominator_id}_baseline"].sum()

                overall_ratio_change = _safe_divide(polars.lit(numerator_sum), polars.lit(denominator_sum)) - _safe_divide(polars.lit(numerator_sum_baseline),
                                                                                                                           polars.lit(denominator_sum_baseline))

                overall_ratio_change_without_segment = _safe_divide(polars.lit(numerator_sum) - polars.col(numerator_id),
                                                                    polars.lit(denominator_sum) - polars.col(denominator_id)) - _safe_divide(
                    polars.lit(numerator_sum_baseline) - polars.col(f"{numerator_id}_baseline"), polars.lit(denominator_sum_baseline) - polars.col(
                        f"{denominator_id}_baseline"))

                return res.with_columns((overall_ratio_change - overall_ratio_change_without_segment).alias("absolute_contribution"))
            return res

        futures = [parallel_analysis_executor.submit(
            gen_sub_df_for_columns, columns
        ) for columns in column_combinations_list]
        wait(futures)

        total_rows = self.overall_aggregated_df['count_baseline'].sum() + self.overall_aggregated_df['count'].sum()
        multi_dimension_grouping_result = polars.concat([future.result() for future in futures]) \
            .filter((polars.col("count") + polars.col("count_baseline")) / polars.lit(total_rows) > 0.01)

        dimension_info_df = multi_dimension_grouping_result.filter(polars.col("dimension_name").list.lengths() == 1) \
            .with_columns(polars.col("dimension_name").list.first()) \
            .groupby(polars.col("dimension_name")) \
            .agg(polars.avg('weighted_relative_change_std').alias("score")) \
            .select('dimension_name', "score") \
            .with_columns([polars.col("score").mean().alias("score_mean"),
                           polars.col("score").std().alias("score_std")])
        dimensions = [Dimension(row['dimension_name'], row['score'], row['score'] > row['score_mean'] or row['score'] > 0.02) for row in
                      dimension_info_df.rows(named=True)]

        weighted_change_mean = multi_dimension_grouping_result.select(
            polars.col("weighted_change").sum() / polars.col("weight").sum()).row(0)
        weighted_std = (multi_dimension_grouping_result.select(
            ((polars.col("weight") * (polars.col("change") - polars.lit(weighted_change_mean)
                                      ).pow(2)).sum() / polars.col("weight").sum()).sqrt()
        )).row(0)

        total_segments = multi_dimension_grouping_result.select(polars.col("dimension_name").count().alias("total_segments")).row(0)[0]

        if isinstance(self.analyzing_metric, DualColumnMetric):
            sort_column = (polars.col(self.analyzing_metric.numerator_metric.get_id()) - polars.col(
                f"{self.analyzing_metric.numerator_metric.get_id()}_baseline")).abs().alias("sort")
        else:
            sort_column = (polars.col(self.analyzing_metric.get_id()) - polars.col(f"{self.analyzing_metric.get_id()}_baseline")).abs().alias("sort")
        change_variance_column = polars.when(polars.col('weighted_std') != 0).then(
            (polars.col('change') - polars.lit(self.expected_value)).abs() / polars.col('weighted_std') * (polars.col('weight') / polars.col('sum')).sqrt()) \
            .otherwise(0) \
            .alias('change_variance')
        dimension_weight_column = polars.when(
            polars.col("dimension_name").list.lengths() == 1
        ).then(polars.lit(1)).otherwise(polars.lit(0)).alias("dimension_weight")

        multi_dimension_grouping_result = multi_dimension_grouping_result.with_columns(polars.lit(weighted_std).alias("weighted_std")) \
            .with_columns([polars.lit(weighted_change_mean).alias('weighted_change_mean'),
                           sort_column, change_variance_column, dimension_weight_column]) \
            .sort([polars.col("dimension_weight"), polars.col("sort").abs()], descending=True) \
            .limit(20000) \
            .sort([polars.col("sort").abs()], descending=True)

        return multi_dimension_grouping_result, dimensions, total_segments

    def convert_to_segment_info(
            self,
            df: polars.DataFrame,
            metric: Metric,
            baseline_count: int,
            comparison_count: int,
            parent_metric: Optional[Metric] = None
    ):
        def _build_serialized_key(row):
            return "|".join([f"{column}:{value}" for column, value in zip(row['dimension_name'], row['dimension_value'])])

        if len(self.key_dimensions) > 0:
            top_segments_df = df.with_columns(polars.concat_list([polars.lit(dimension) for dimension in self.key_dimensions]).alias("key_dimensions")) \
                .filter(polars.col("dimension_name").list.set_intersection("key_dimensions").list.lengths() == polars.col("dimension_name").list.lengths()) \
                .limit(1000)
            top_segment_keys = [_build_serialized_key(row) for row in top_segments_df.rows(named=True)]
        else:
            top_segment_keys = []

        def map_to_segment_info(row):
            values = row["dimension_value"]
            dimensions = row['dimension_name']
            key = tuple([DimensionValuePair(dimensions[i], str(values[i]))
                         for i in range(len(dimensions))])
            serialized_key = _build_serialized_key(row)

            current_period_value = PeriodValue(
                row['count'], 0 if comparison_count == 0 else row['count'] / comparison_count, row[metric.get_id()])
            last_period_value = PeriodValue(
                row['count_baseline'], 0 if baseline_count == 0 else row['count_baseline'] / baseline_count,
                row[f'{metric.get_id()}_baseline'])

            p_value = -1
            if parent_metric is None and serialized_key in top_segment_keys:
                filters = polars.lit(True)
                for column, value in zip(row['dimension_name'], row['dimension_value']):
                    filters = filters & polars.col(column).cast(polars.Utf8).eq(value)
                filtered_joined_df = self.joined_df.filter(filters)

                value_list = filtered_joined_df[f"{metric.get_id()}"]
                value_list_baseline = filtered_joined_df[f"{metric.get_id()}_baseline"]

                if value_list is not None and value_list_baseline is not None:
                    value_list = numpy.array(value_list)
                    value_list_baseline = numpy.array(value_list_baseline)

                    if isinstance(metric, DualColumnMetric):
                        diff = value_list - value_list_baseline
                    else:
                        relative_diff = ((value_list - value_list_baseline) / value_list_baseline) * 100
                        relative_diff = relative_diff[~np.isinf(relative_diff)]
                        relative_diff = relative_diff[~np.isnan(relative_diff)]
                        diff = relative_diff

                    if len(diff) > len(value_list) / 2:
                        mean_diff = np.mean(diff)
                        std_diff = np.std(diff, ddof=1)

                        n = len(diff)

                        standard_error = std_diff / np.sqrt(n)
                        t_statistic = mean_diff / standard_error
                        p_value = 2 * (1 - stats.t.cdf(abs(t_statistic), df=n - 1))

            slice_info = SegmentInfo(
                key,
                serialized_key,
                last_period_value,
                current_period_value,
                current_period_value.sliceValue - last_period_value.sliceValue,
                row['change'],
                row['change_variance'],
                row['absolute_contribution'],
                float(p_value)
            )

            return slice_info.serializedKey, slice_info

        segments = [map_to_segment_info(row) for row in df.rows(named=True)]
        segments_dict = {serialized_key: segment for serialized_key, segment in segments}
        return segments_dict, list(top_segment_keys)
