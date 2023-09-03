import datetime
import itertools
import json
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import asdict, dataclass
from itertools import combinations
from typing import Dict, List, Tuple

import numpy as np
import orjson
import pandas as pd
import polars as polars
from loguru import logger


@dataclass
class Dimension:
    name: str = None
    values: List[str] = None


@dataclass(frozen=True)
class DimensionValuePair:
    dimension: str = None
    value: str = None


# @dataclass(frozen=True)
# class DimensionSliceKey:
#     dimension_value_pairs: tuple[DimensionValuePair]


@dataclass
class PeriodValue:
    sliceCount: int = None
    sliceSize: float = None
    sliceValue: float = None


@dataclass
class DimensionSliceInfo:
    key: tuple[DimensionValuePair] = None
    serializedKey: str = None
    topDrivingDimensionSliceKeys: List[str] = None
    baselineValue: PeriodValue = None
    comparisonValue: PeriodValue = None
    impact: float = None
    changePercentage: float = None
    changeDev: float = None


@dataclass
class ValueByDate:
    date: str
    value: float


@dataclass
class Metric:
    name: str = None
    totalSegments: int = None
    expectedChangePercentage: float = None
    aggregationMethod: str = None
    baselineNumRows: int = None
    comparisonNumRows: int = None
    baselineValue: float = None
    comparisonValue: float = None
    baselineValueByDate: list[ValueByDate] = None
    comparisonValueByDate: list[ValueByDate] = None
    baselineDateRange: List[str] = None
    comparisonDateRange: List[str] = None
    topDriverSliceKeys: List[str] = None
    dimensions: Dict[str, Dimension] = None
    dimensionSliceInfo: Dict[str, DimensionSliceInfo] = None
    keyDimensions: List[str] = None


parallel_analysis_executor = ThreadPoolExecutor()


def toDimensionSliceInfo(df: polars.DataFrame, metrics_name, baselineCount: int, comparisonCount, expected_value):
    # calculate the change and std
    df = df.with_columns(
        (polars.col(metrics_name) -
         polars.col(f"{metrics_name}_baseline")).abs().alias("impact")
    )

    df = df.with_columns(
        polars.when(
            polars.col("dimension_name").list.lengths() == 1
        ).then(polars.lit(1)).otherwise(polars.lit(0)).alias("dimension_weight")
    ).sort([polars.col("dimension_weight"), polars.col("impact").abs()], descending=True) \
        .limit(20000) \
        .sort([polars.col("impact").abs()], descending=True)

    def mapToObj(row):
        values = row["dimension_value"]
        dimensions = row['dimension_name']

        key = tuple([DimensionValuePair(dimensions[i], str(values[i]))
                     for i in range(len(dimensions))])
        sorted_key = sorted(key, key=lambda x: x.dimension)
        serialized_key = '|'.join(
            [f'{dimensionValuePair.dimension}:{dimensionValuePair.value}' for dimensionValuePair in sorted_key])

        current_period_value = PeriodValue(
            row['count'], row['count'] / comparisonCount, row[metrics_name])
        last_period_value = PeriodValue(
            row['count_baseline'], row['count_baseline'] / baselineCount,
            row[f'{metrics_name}_baseline'])

        slice_info = DimensionSliceInfo(
            key,
            serialized_key,
            [],
            last_period_value,
            current_period_value,
            current_period_value.sliceValue - last_period_value.sliceValue,
            row['change'],
            abs(row['weighted_change']) / row['weighted_std']
        )

        return slice_info

    dimension_slice_info = [mapToObj(row) for row in df.rows(named=True)]
    return dimension_slice_info


def build_polars_agg(name: str, method: str):
    if method == 'sum':
        return polars.sum(name)
    elif method == 'count':
        return polars.count(name)
    elif method == 'nunique':
        return polars.n_unique(name).cast(int)


def parAnalyzeHelper(
        baseline_df: pd.DataFrame,
        comparison_df: pd.DataFrame,
        agg_method: Dict[str, str],
        metrics_name: Dict[str, str],
        columns_list: List[List[str]],
        expected_value: float,
        all_columns: List[str]):
    overall_agg_methods = [build_polars_agg(
        name, method) for name, method in agg_method.items()]
    baseline_df = baseline_df.groupby(all_columns).agg(overall_agg_methods)
    comparison_df = comparison_df.groupby(all_columns).agg(overall_agg_methods)

    sub_df_agg_methods = [build_polars_agg(
        name, "sum") for name, method in agg_method.items()]

    def func(columns):
        columns = list(columns)
        baseline = baseline_df.groupby(columns).agg(
            sub_df_agg_methods).rename(metrics_name)
        comparison = comparison_df.groupby(columns).agg(
            sub_df_agg_methods).rename(metrics_name)

        joined: polars = comparison.join(
            baseline,
            on=columns,
            suffix='_baseline',
            how='outer'
        ).fill_nan(0).fill_null(0) \
            .with_columns(polars.lit([columns], dtype=polars.List).alias("dimension_name")) \
            .with_columns(polars.concat_list([polars.col(column).cast(str) for column in columns]).alias("dimension_value")) \
            .drop(columns)

        analyzing_metric_name = next(iter(metrics_name.values()))
        metric_value_sum, baseline_metric_value_sum = joined.select((polars.col(
            analyzing_metric_name, f"{analyzing_metric_name}_baseline").sum())).row(0)

        joined = joined \
            .with_columns((polars.lit(metric_value_sum) + polars.lit(baseline_metric_value_sum)).alias("sum")) \
            .with_columns(
                ((polars.col(analyzing_metric_name) + polars.col(f"{analyzing_metric_name}_baseline")) / (
                    polars.lit(metric_value_sum) + polars.lit(baseline_metric_value_sum))
                 ).alias("weight"),
                polars.when(
                    polars.col(f"{analyzing_metric_name}_baseline") == 0
                ).then(
                    polars.when(
                        polars.col(analyzing_metric_name) > 0
                    ).then(polars.lit(1)).otherwise(polars.lit(-1))
                ).otherwise(
                    (polars.col(analyzing_metric_name) - polars.col(f"{analyzing_metric_name}_baseline")) / polars.col(
                        f"{analyzing_metric_name}_baseline")
                ).alias("change")
            ).with_columns(
                (polars.col("change") - polars.lit(expected_value)
                 ).alias("calibrated_change")
            ).with_columns(
                (polars.col("weight") * polars.col("calibrated_change")
                 ).alias("weighted_change")
            )

        weighted_change_mean = joined.select(
            polars.col("weighted_change").sum()).row(0)
        weighted_std = (joined.select(
            (polars.col("weight") * (polars.col("weighted_change") -
             polars.lit(weighted_change_mean)).pow(2)).sum().sqrt()
        )).row(0)
        joined = joined.with_columns(
            polars.lit(weighted_std).alias("weighted_std")
        )

        return joined

    futures = [parallel_analysis_executor.submit(
        func, columns
    ) for columns in columns_list]
    wait(futures)

    return polars.concat([future.result() for future in futures])


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        return super(NpEncoder, self).default(obj)


def flatten(list_of_lists):
    return list(itertools.chain.from_iterable(list_of_lists))


def calculateTotalSegments(dimensions: Dict[str, Dimension]) -> int:
    nums = list(map(lambda x: len(x.values), dimensions.values()))

    def backtrack(start, curr_subset):
        all_subsets.append(list(curr_subset))
        for i in range(start, len(nums)):
            curr_subset.append(nums[i])
            backtrack(i + 1, curr_subset)
            curr_subset.pop()

    all_subsets = []
    backtrack(0, [])

    return np.sum([np.prod(subset) for subset in all_subsets])


def find_key_dimensions(df: pd.DataFrame) -> List[str]:
    processed_single_dimension_df = process_single_dimension_df(df)
    return processed_single_dimension_df[processed_single_dimension_df['result'] > 0.01]['dimension_name'].tolist()


def process_single_dimension_df(df: pd.DataFrame) -> pd.DataFrame:
    sum_df = df.groupby(['dimension_name']).agg({
        'metric_value_comparison': 'sum',
        'metric_value_baseline': 'sum'
    }).reset_index().set_index('dimension_name')
    df = df.reset_index().set_index('dimension_name')
    df = df.reset_index().join(sum_df, how='inner', rsuffix='_sum', on='dimension_name')

    df['weight'] = (df['metric_value_comparison'] + df['metric_value_baseline']) / \
        (df['metric_value_comparison_sum'] + df['metric_value_baseline_sum'])
    df['change'] = np.where(df['metric_value_baseline'] == 0, 0,
                            (df['metric_value_comparison'] - df['metric_value_baseline']) / df['metric_value_baseline'])
    # df['change'] = np.where(df['metric_value_baseline'] == 0, df['change'].max(),
    #                         (df['metric_value_comparison'] - df['metric_value_baseline']) / df['metric_value_baseline'])

    df['weighted_change'] = df['weight'] * df['change']
    df_with_weighted_mean_change = df.groupby(['dimension_name']).agg({
        'weighted_change': 'sum',  # sum of weight always = 1, no need to divide
    }).rename(columns={'weighted_change': 'weighted_change_mean'})
    merged_df = pd.merge(df, df_with_weighted_mean_change,
                         on='dimension_name', how='inner')
    merged_df['weighted_change_std_input'] = merged_df['weight'] * \
        np.power(merged_df['change'] - merged_df['weighted_change_mean'], 2)

    grouped_merged_df = merged_df.groupby(['dimension_name']).agg({
        'weighted_change_std_input': 'sum'
    })
    grouped_merged_df['result'] = np.sqrt(
        np.array(grouped_merged_df['weighted_change_std_input'], dtype=np.float64))

    return grouped_merged_df.reset_index()


def split_list_into_chunks(lst, num_chunks):
    chunk_size = len(lst) // num_chunks
    remainder = len(lst) % num_chunks

    sublists = []
    index = 0
    for _ in range(num_chunks):
        if remainder > 0:
            sublists.append(lst[index:index + chunk_size + 1])
            index += chunk_size + 1
            remainder -= 1
        else:
            sublists.append(lst[index:index + chunk_size])
            index += chunk_size

    return sublists


class MetricsController(object):
    def __init__(self,
                 data: polars.DataFrame,
                 baseline_date_range: Tuple[datetime.date, datetime.date],
                 comparison_date_range: Tuple[datetime.date, datetime.date],
                 date_column: str,
                 columns_of_interest: List[str],
                 agg_method: Dict[str, str],
                 metrics_name: Dict[str, str],
                 expected_value: float):
        self.df = data
        self.columns_of_interest = columns_of_interest
        self.agg_method = agg_method
        self.metrics_name = metrics_name
        self.date_column = date_column
        self.baseline_date_range = baseline_date_range
        self.comparison_date_range = comparison_date_range

        self.expected_value = expected_value

        self.slices_df = polars.DataFrame()
        self.keyDimensions = []

        logger.info('init')
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
        self.slice()
        self.aggs = self.gen_agg_df()
        logger.info('init done')

    def gen_agg_df(self):
        po_agg_method = self.po_agg_method()
        baseline = self.baseline_df.select(
            po_agg_method).rename(self.metrics_name)
        comparison = self.comparison_df.select(
            po_agg_method).rename(self.metrics_name)

        return comparison.join(baseline, suffix='_baseline', how='cross').fill_nan(0).fill_null(0)

    def po_agg_method(self):
        return [build_polars_agg(name, method) for name, method in self.agg_method.items()]

    def gen_value_by_date(self, df: polars.DataFrame, metric_name: str):
        aggregated_df = df.groupby('date').agg(self.po_agg_method()) \
            .sort('date') \
            .with_columns(polars.col('date').cast(polars.Utf8))

        return [
            {
                "date": row['date'],
                "value": row[f'{metric_name}']
            }
            for row in aggregated_df.rows(named=True)
        ]

    def slice(self):
        columns_list = []
        for i in range(1, min(4, len(self.columns_of_interest) + 1)):
            columns_list.extend(combinations(self.columns_of_interest, i))
        self.slices_df, self.keyDimensions = self.par_analyze(
            columns_list, self.metrics_name)

    def getDimensions(self) -> Dict[str, Dimension]:
        dimensions = {}
        unique_values_df = polars.concat([
            self.df.lazy()
            .select(polars.col(column).unique().cast(str).alias("value"))
            .with_columns(polars.lit(column).alias("key"))
            for column in self.columns_of_interest
        ]).collect()

        for column in self.columns_of_interest:
            rows = unique_values_df.filter(
                (polars.col("key").eq(column)) & (
                    polars.col("value").is_not_null())
            ).select("value").rows(named=True)
            dimensions[column] = Dimension(
                name=column, values=[row['value'] for row in rows])
        return dimensions

    def getTopDrivingDimensionSliceKeys(self,
                                        parentSlice: tuple[DimensionValuePair],
                                        slice_info_dict: Dict[frozenset[DimensionValuePair], DimensionSliceInfo],
                                        topN=1000) -> List[str]:
        """
        Only calculate first level child impact
        """
        parentDimension = [slice.dimension for slice in parentSlice]
        childDimensions = [
            dimension for dimension in self.columns_of_interest if dimension not in parentDimension]

        childSliceKey = [
            frozenset(
                parentSlice + (DimensionValuePair(dimension, value),)
            )
            for dimension in childDimensions
            for value in self.getDimensions()[dimension].values
        ]

        slice_info = [slice_info_dict[key]
                      for key in childSliceKey if key in slice_info_dict]
        return list(map(lambda slice: slice.serializedKey, slice_info[:topN]))

    def buildMetrics(self, metricsName: str) -> Metric:
        metrics = Metric()
        metrics.name = metricsName
        metrics.baselineNumRows = self.aggs['count_baseline'].sum()
        metrics.comparisonNumRows = self.aggs['count'].sum()
        metrics.dimensions = self.getDimensions()
        metrics.totalSegments = self.slices_df.select(polars.count()).row(0)[0]
        metrics.keyDimensions = self.keyDimensions

        # Build dimension slice info
        logger.info(f'Building dimension slice info for {metricsName}')

        all_dimension_slices = toDimensionSliceInfo(
            self.slices_df, metricsName, metrics.baselineNumRows, metrics.comparisonNumRows, self.expected_value)

        logger.info('Building top driver slice keys')
        slices_suitable_for_top_slices = [
            dimension_slice for dimension_slice in all_dimension_slices
            if set(map(lambda key: key.dimension, dimension_slice.key)).issubset(set(metrics.keyDimensions))
        ]
        metrics.topDriverSliceKeys = list(map(
            lambda slice: slice.serializedKey,
            [dimension_slice for dimension_slice in slices_suitable_for_top_slices[:1000]]))
        metrics.dimensionSliceInfo = {dimension_slice.serializedKey: dimension_slice
                                      for dimension_slice in all_dimension_slices
                                      }
        metrics.baselineValue = self.aggs[f'{metricsName}_baseline'].sum()
        metrics.comparisonValue = self.aggs[metricsName].sum()

        logger.info('Building baseline value by date')

        metrics.aggregationMethod = self.agg_method[metricsName]
        metrics.expectedChangePercentage = self.expected_value
        metrics.baselineValueByDate = self.gen_value_by_date(
            self.baseline_df, metricsName)
        metrics.comparisonValueByDate = self.gen_value_by_date(
            self.comparison_df, metricsName)

        metrics.baselineDateRange = [self.baseline_date_range[0].strftime(
            "%Y-%m-%d"), self.baseline_date_range[1].strftime("%Y-%m-%d")]
        metrics.comparisonDateRange = [self.comparison_date_range[0].strftime(
            "%Y-%m-%d"), self.comparison_date_range[1].strftime("%Y-%m-%d")]

        logger.info('Finished building metrics')

        return metrics

    def getSlices(self):
        return self.slices_df

    def getMetrics(self) -> str:
        logger.info(f'Building metrics for {self.metrics_name}')
        ret = {
            k: self.buildMetrics(k)
            for idx, (k, v) in enumerate(self.metrics_name.items())
            if k != self.date_column
        }

        logger.info(f'Finished building metrics for {self.metrics_name}')
        ret = orjson.dumps(ret)
        logger.info(f'Finished dumping metrics for {self.metrics_name}')
        return ret

    def par_analyze(self,
                    columns: List[List[str]],
                    metrics_name: Dict[str, str]):
        single_dimension_df = polars.DataFrame()
        for column in self.columns_of_interest:
            metric_name, aggregation_method = next(
                iter(self.agg_method.items()))

            baseline = self.baseline_df.rename({
                column: 'dimension_value',
                metric_name: 'metric_value_baseline'
            }).with_columns(polars.col('dimension_value').cast(str)) \
                .with_columns(polars.lit(column).alias('dimension_name'))

            baseline = baseline.groupby(['dimension_value', 'dimension_name']).agg(
                build_polars_agg('metric_value_baseline', aggregation_method)
            )

            comparison = self.comparison_df.rename({
                column: 'dimension_value',
                metric_name: 'metric_value_comparison'
            }).with_columns(polars.col('dimension_value').cast(str)) \
                .with_columns(polars.lit(column).alias('dimension_name'))
            comparison = comparison.groupby(['dimension_value', 'dimension_name']).agg(
                build_polars_agg('metric_value_comparison', aggregation_method)
            )

            joined = baseline.join(
                comparison, on=['dimension_value', 'dimension_name'], how='outer')
            joined.fill_nan(0).fill_null(0)

            single_dimension_df = polars.concat([single_dimension_df, joined])

        multi_dimension_grouping_result = parAnalyzeHelper(
            self.baseline_df,
            self.comparison_df,
            self.agg_method,
            metrics_name,
            columns,
            self.expected_value,
            self.columns_of_interest
        )

        return multi_dimension_grouping_result, find_key_dimensions(single_dimension_df.to_pandas())
