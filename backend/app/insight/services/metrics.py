import datetime
import itertools
import json
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import asdict, dataclass
from itertools import combinations
from typing import Dict, List, Tuple

import numpy as np
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
class Metric:
    name: str = None
    totalSegments: int = None
    expectedChangePercentage: float = None
    aggregationMethod: str = None
    baselineNumRows: int = None
    comparisonNumRows: int = None
    baselineValue: float = None
    comparisonValue: float = None
    baselineValueByDate: Dict[str, float] = None
    comparisonValueByDate: Dict[str, float] = None
    baselineDateRange: List[str] = None
    comparisonDateRange: List[str] = None
    topDriverSliceKeys: List[str] = None
    dimensions: Dict[str, Dimension] = None
    dimensionSliceInfo: Dict[str, DimensionSliceInfo] = None
    keyDimensions: List[str] = None


parallel_analysis_executor = ThreadPoolExecutor()


def analyze(df,
            baseline_period: Tuple[datetime.date, datetime.date],
            comparison_period: Tuple[datetime.date, datetime.date],
            date_column,
            agg_method: Dict[str, str],
            metrics_name: Dict[str, str],
            columns: List[str]):
    baseline = pd.DataFrame(
        df.loc[
            df[date_column].between(
                pd.to_datetime(baseline_period[0], utc=True),
                pd.to_datetime(baseline_period[1] + pd.DateOffset(1), utc=True))
        ].agg(agg_method)).transpose().rename(columns=metrics_name)
    comparison = pd.DataFrame(
        df.loc[
            df[date_column].between(
                pd.to_datetime(comparison_period[0], utc=True),
                pd.to_datetime(comparison_period[1] + pd.DateOffset(1), utc=True))
        ].agg(agg_method)).transpose().rename(columns=metrics_name)

    joined = baseline.join(comparison, lsuffix='_baseline', how='outer')
    joined.fillna(0, inplace=True)
    return joined


def toDimensionSliceInfo(df: polars.DataFrame, metrics_name, baselineCount: int, comparisonCount, expected_value):
    # calculate the change and std
    df = df.with_columns(
        polars.when(
            polars.col(f"{metrics_name}_baseline") == 0
        ).then(
            polars.when(
                polars.col(metrics_name) > 0
            ).then(polars.lit(0.2)).otherwise(polars.lit(-1))
        ).otherwise(
            (polars.col(metrics_name) - polars.col(f"{metrics_name}_baseline")) / polars.col(f"{metrics_name}_baseline")
        ).alias("change")
    ).with_columns(
        (polars.col(metrics_name) - polars.col(f"{metrics_name}_baseline")).abs().alias("impact")
    )

    lower_change, upper_change = df.select([
        polars.quantile("change", 0.2, "nearest").alias("lower"),
        polars.quantile("change", 0.8, "nearest").alias("upper")
    ]).row(0)

    change_std = df.select(polars.col("change")).filter(
        (polars.col("change") >= polars.lit(lower_change)) & (polars.col("change") <= polars.lit(upper_change))
    ).std().row(0)[0]

    df = df.with_columns(
        polars.when(
            polars.col("dimension_names").list.lengths() == 1
        ).then(polars.lit(1)).otherwise(polars.lit(0)).alias("dimension_weight")
    ).sort([polars.col("dimension_weight"), polars.col("impact")], descending=True).limit(20000)

    def mapToObj(row):
        values = row["dimension_values"]
        dimensions = row['dimension_names']

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
            abs(row['change'] - expected_value) / change_std
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
        return polars.n_unique(name)


def parAnalyzeHelper(
        baseline_df: pd.DataFrame,
        comparison_df: pd.DataFrame,
        agg_method: Dict[str, str],
        metrics_name: Dict[str, str],
        columns_list: List[List[str]]):
    po_agg_method = [build_polars_agg(name, method) for name, method in agg_method.items()]

    res = polars.DataFrame()

    def func(columns):
        columns = list(columns)
        baseline = baseline_df.groupby(columns) \
            .agg(po_agg_method).rename(metrics_name)
        comparison = comparison_df.groupby(columns) \
            .agg(po_agg_method).rename(metrics_name)

        return comparison.join(
            baseline,
            on=columns,
            suffix='_baseline',
            how='outer'
        ).fill_nan(0).fill_null(0) \
            .with_columns(polars.lit([columns], dtype=polars.List).alias("dimension_names")) \
            .with_columns(polars.concat_list([polars.col(column).cast(str) for column in columns]).alias("dimension_values")) \
            .drop(columns)

    futures = [parallel_analysis_executor.submit(
        func, columns
    ) for columns in columns_list]
    wait(futures)
    for future in futures:
        res = polars.concat([res, future.result()])

    return res


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

    df['weight'] = (df['metric_value_comparison'] + df['metric_value_baseline']) / (df['metric_value_comparison_sum'] + df['metric_value_baseline_sum'])
    df['change'] = np.where(df['metric_value_baseline'] == 0, 0,
                            (df['metric_value_comparison'] - df['metric_value_baseline']) / df['metric_value_baseline'])
    # df['change'] = np.where(df['metric_value_baseline'] == 0, df['change'].max(),
    #                         (df['metric_value_comparison'] - df['metric_value_baseline']) / df['metric_value_baseline'])

    df['weighted_change'] = df['weight'] * df['change']
    df_with_weighted_mean_change = df.groupby(['dimension_name']).agg({
        'weighted_change': 'sum',  # sum of weight always = 1, no need to divide
    }).rename(columns={'weighted_change': 'weighted_change_mean'})
    merged_df = pd.merge(df, df_with_weighted_mean_change, on='dimension_name', how='inner')
    merged_df['weighted_change_std_input'] = merged_df['weight'] * np.power(merged_df['change'] - merged_df['weighted_change_mean'], 2)

    grouped_merged_df = merged_df.groupby(['dimension_name']).agg({
        'weighted_change_std_input': 'sum'
    })
    grouped_merged_df['result'] = np.sqrt(np.array(grouped_merged_df['weighted_change_std_input'], dtype=np.float64))

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
                 data: pd.DataFrame,
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

        self.aggs = analyze(self.df, baseline_date_range, comparison_date_range,
                            date_column, agg_method, metrics_name, self.columns_of_interest)
        self.expected_value = expected_value

        self.slices_df = polars.DataFrame()
        self.keyDimensions = []
        logger.info('init')
        self.slice(baseline_date_range, comparison_date_range)
        logger.info('init done')

    def slice(self, baseline_period, comparison_period):
        columnsList = []
        for i in range(1, min(4, len(self.columns_of_interest) + 1)):
            columnsList.extend(list(combinations(self.columns_of_interest, i)))
        self.slices_df, self.keyDimensions = self.parAnalyze(
            self.df, baseline_period, comparison_period,
            self.date_column, columnsList, self.agg_method, self.metrics_name
        )

    def getDimensions(self) -> Dict[str, Dimension]:
        dimensions = {}
        for column in self.columns_of_interest:
            values = self.df[column].unique()
            values = list(
                filter(lambda x: x is not None and x is not np.NaN, values))
            dimensions[column] = Dimension(name=column, values=values)
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
        slice_info.sort(key=lambda slice: abs(slice.impact), reverse=True)
        return list(map(lambda slice: slice.serializedKey, slice_info[:topN]))

    def buildMetrics(self, metricsName: str) -> Metric:
        metrics = Metric()
        metrics.name = metricsName
        metrics.baselineNumRows = self.aggs['count_baseline'].sum()
        metrics.comparisonNumRows = self.aggs['count'].sum()
        metrics.dimensions = self.getDimensions()
        metrics.totalSegments = calculateTotalSegments(metrics.dimensions)
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

        baseline = self.df.loc[self.df[self.date_column].between(
            pd.to_datetime(self.baseline_date_range[0], utc=True),
            pd.to_datetime(self.baseline_date_range[1] + pd.DateOffset(1), utc=True))
        ].groupby('date').agg(self.agg_method)
        comparison = self.df.loc[self.df[self.date_column].between(
            pd.to_datetime(self.comparison_date_range[0], utc=True),
            pd.to_datetime(self.comparison_date_range[1] + pd.DateOffset(1), utc=True))
        ].groupby('date').agg(self.agg_method)

        metrics.aggregationMethod = self.agg_method[metricsName]
        metrics.expectedChangePercentage = self.expected_value
        metrics.baselineValueByDate = [
            {
                "date": index.strftime("%Y-%m-%d"),
                "value": row[f'{metricsName}']
            }
            for index, row in baseline.iterrows()
        ]
        metrics.comparisonValueByDate = [
            {
                "date": index.strftime("%Y-%m-%d"),
                "value": row[f'{metricsName}']
            }
            for index, row in comparison.iterrows()
        ]

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
            k: asdict(self.buildMetrics(k))
            for k, v in self.metrics_name.items()
            if k != self.date_column
        }

        logger.info(f'Finished building metrics for {self.metrics_name}')
        ret = json.dumps(ret, cls=NpEncoder, allow_nan=False)
        logger.info(f'Finished dumping metrics for {self.metrics_name}')
        return ret

    def parAnalyze(self,
                   df: pd.DataFrame,
                   baseline_period: Tuple[datetime.date, datetime.date],
                   comparison_period: Tuple[datetime.date, datetime.date],
                   date_column: str,
                   columns: List[List[str]],
                   agg_method: Dict[str, str],
                   metrics_name: Dict[str, str]):
        baseline_df = polars.from_pandas(df.loc[df[date_column].between(
            pd.to_datetime(baseline_period[0], utc=True),
            pd.to_datetime(baseline_period[1] + pd.DateOffset(1), utc=True))])
        comparison_df = polars.from_pandas(df.loc[df[date_column].between(
            pd.to_datetime(comparison_period[0], utc=True),
            pd.to_datetime(comparison_period[1] + pd.DateOffset(1), utc=True))])

        single_dimension_df = polars.DataFrame()
        for column in self.columns_of_interest:
            metric_name, aggregation_method = next(iter(agg_method.items()))

            baseline = baseline_df.rename({
                column: 'dimension_value',
                metric_name: 'metric_value_baseline'
            }).with_columns(polars.col('dimension_value').cast(str)) \
                .with_columns(polars.lit(column).alias('dimension_name'))

            baseline = baseline.groupby(['dimension_value', 'dimension_name']).agg(
                build_polars_agg('metric_value_baseline', aggregation_method)
            )

            comparison = comparison_df.rename({
                column: 'dimension_value',
                metric_name: 'metric_value_comparison'
            }).with_columns(polars.col('dimension_value').cast(str)) \
                .with_columns(polars.lit(column).alias('dimension_name'))
            comparison = comparison.groupby(['dimension_value', 'dimension_name']).agg(
                build_polars_agg('metric_value_comparison', aggregation_method)
            )

            joined = baseline.join(comparison, on=['dimension_value', 'dimension_name'], how='outer')
            joined.fill_nan(0).fill_null(0)

            single_dimension_df = polars.concat([single_dimension_df, joined])

        multi_dimension_grouping_result = parAnalyzeHelper(baseline_df, comparison_df, agg_method, metrics_name, columns)
        return multi_dimension_grouping_result, find_key_dimensions(single_dimension_df.to_pandas())
