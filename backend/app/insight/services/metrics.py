import datetime
import itertools
import json
import multiprocessing as mp
from dataclasses import asdict, dataclass
from functools import partial
from itertools import combinations
from multiprocessing import Pool
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
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


def analyze(df,
            baseline_period: Tuple[datetime.date, datetime.date],
            comparison_period: Tuple[datetime.date, datetime.date],
            date_column,
            agg_method: Dict[str, str],
            metrics_name: Dict[str, str],
            columns: List[str]):
    columns = list(columns)

    baseline = df.loc[df[date_column].between(
        pd.to_datetime(baseline_period[0], utc=True),
        pd.to_datetime(baseline_period[1] + pd.DateOffset(1), utc=True))
    ].groupby(columns).agg(agg_method).rename(columns=metrics_name)
    comparison = df.loc[df[date_column].between(
        pd.to_datetime(comparison_period[0], utc=True),
        pd.to_datetime(comparison_period[1] + pd.DateOffset(1), utc=True))
    ].groupby(columns).agg(agg_method).rename(columns=metrics_name)

    joined = baseline.join(comparison, lsuffix='_baseline', how='outer')
    joined.fillna(0, inplace=True)
    return joined


def toDimensionSliceInfo(df: pd.DataFrame, metrics_name, baselineCount: int, comparisonCount):
    dimensions = [df.index.name] if df.index.name else list(df.index.names)

    def mapToObj(index, row):
        index = index if (isinstance(index, list)
                          or isinstance(index, tuple)) else [index]

        key = tuple([DimensionValuePair(dimensions[i], str(index[i]))
                    for i in range(len(dimensions))])

        sorted_key = sorted(key, key=lambda x: x.dimension)
        serializedKey = '|'.join(
            [f'{dimensionValuePair.dimension}:{dimensionValuePair.value}' for dimensionValuePair in sorted_key])

        currentPeriodValue = PeriodValue(
            row['count'], row['count'] / comparisonCount, row[metrics_name])
        lastPeriodValue = PeriodValue(
            row[f'count_baseline'], row['count_baseline'] / baselineCount, row[f'{metrics_name}_baseline'])

        sliceInfo = DimensionSliceInfo(
            key,
            serializedKey,
            [],
            lastPeriodValue,
            currentPeriodValue,
            currentPeriodValue.sliceValue - lastPeriodValue.sliceValue)
        return sliceInfo

    dimensionSliceInfos = df.apply(
        lambda row: mapToObj(row.name, row), axis=1).tolist()
    return dimensionSliceInfos


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)


def parAnalyze(df: pd.DataFrame,
               baseline_period: Tuple[datetime.date, datetime.date],
               comparison_period: Tuple[datetime.date, datetime.date],
               date_column: str,
               columns: List[List[str]],
               agg_method: Dict[str, str],
               metrics_name: Dict[str, str]):
    baseline_df = df.loc[df[date_column].between(
        pd.to_datetime(baseline_period[0], utc=True),
        pd.to_datetime(baseline_period[1] + pd.DateOffset(1), utc=True))
    ]
    comparison_df = df.loc[df[date_column].between(
        pd.to_datetime(comparison_period[0], utc=True),
        pd.to_datetime(comparison_period[1] + pd.DateOffset(1), utc=True))
    ]

    def func(columns: List[str]):
        columns = list(columns)

        baseline = baseline_df.groupby(columns).agg(
            agg_method).rename(columns=metrics_name)
        comparison = comparison_df.groupby(columns).agg(
            agg_method).rename(columns=metrics_name)

        joined = baseline.join(comparison, lsuffix='_baseline', how='outer')
        joined.fillna(0, inplace=True)
        return joined

    return list(map(func, columns))


def flatten(list_of_lists):
    return list(itertools.chain.from_iterable(list_of_lists))


def parToDimensionSliceInfo(slices, metrics_name, baselineCount: int, comparisonCount) -> List[DimensionSliceInfo]:
    func = partial(toDimensionSliceInfo, metrics_name=metrics_name,
                   baselineCount=baselineCount, comparisonCount=comparisonCount)
    all_dimension_slices = map(
        func,
        slices
    )
    return flatten(all_dimension_slices)


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

        self.slices = []
        logger.info('init')
        self.slice(baseline_date_range, comparison_date_range)
        logger.info('init done')

    def slice(self, baseline_period, comparison_period):
        columnsList = []
        for i in range(1, min(4, len(self.columns_of_interest) + 1)):
            columnsList.extend(list(combinations(self.columns_of_interest, i)))
        self.slices = parAnalyze(self.df, baseline_period, comparison_period,
                                 self.date_column, columnsList, self.agg_method, self.metrics_name)

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

        # Build dimension slice info
        logger.info(f'Building dimension slice info for {metricsName}')

        all_dimension_slices = parToDimensionSliceInfo(
            self.slices, metricsName, metrics.baselineNumRows, metrics.comparisonNumRows)

        all_dimension_slices.sort(
            key=lambda slice: abs(slice.impact), reverse=True)
        for sliceInfo in all_dimension_slices:
            sliceInfo.changePercentage = 0.2 if sliceInfo.baselineValue.sliceValue == 0 else (
                sliceInfo.comparisonValue.sliceValue - sliceInfo.baselineValue.sliceValue) / sliceInfo.baselineValue.sliceValue
        lower = np.percentile(
            [sliceInfo.changePercentage for sliceInfo in all_dimension_slices], 20)
        upper = np.percentile(
            [sliceInfo.changePercentage for sliceInfo in all_dimension_slices], 80)
        changes = [sliceInfo.changePercentage for sliceInfo in all_dimension_slices if sliceInfo.changePercentage >=
                   lower and sliceInfo.changePercentage <= upper]
        changeStdDev = np.std(changes)
        for sliceInfo in all_dimension_slices:
            sliceInfo.changeDev = abs(
                (sliceInfo.changePercentage - self.expected_value) / changeStdDev)

        logger.info('Building top driver slice keys')
        metrics.topDriverSliceKeys = list(map(
            lambda slice: slice.serializedKey,
            [dimension_slice for dimension_slice in all_dimension_slices[:1000]]))
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
        return self.slices

    def getMetrics(self) -> str:
        logger.info(f'Building metrics for {self.metrics_name}')
        ret = {
            k: asdict(self.buildMetrics(k))
            for k, v in self.metrics_name.items()
            if k != self.date_column
        }

        logger.info(f'Finished building metrics for {self.metrics_name}')
        ret = json.dumps(ret, cls=NpEncoder)
        logger.info(f'Finished dumping metrics for {self.metrics_name}')
        return ret
