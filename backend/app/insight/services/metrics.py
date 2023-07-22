from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple
import pandas as pd
from itertools import combinations
import json
import numpy as np
import datetime
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

@dataclass
class Metrics:
    name: str = None
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
            columns: List[str],
            agg_method: Dict[str, str],
            metrics_name: Dict[str, str]):
    baseline = df.loc[df[date_column].between(
        pd.to_datetime(baseline_period[0], utc=True),
        pd.to_datetime(baseline_period[1], utc=True))
    ].groupby(columns).agg(agg_method).rename(columns = metrics_name)
    comparison = df.loc[df[date_column].between(
        pd.to_datetime(comparison_period[0], utc=True),
        pd.to_datetime(comparison_period[1], utc=True))
    ].groupby(columns).agg(agg_method).rename(columns = metrics_name)

    joined = baseline.join(comparison, lsuffix='_baseline', how='outer')
    joined.fillna(0, inplace=True)
    return joined

def toDimensionSliceInfo(df: pd.DataFrame, metrics_name, baselineCount: int, comparisonCount) -> Dict[frozenset, DimensionSliceInfo]:
    dimensions = [df.index.name] if df.index.name else list(df.index.names)
    def mapToObj(index, row):
        index = index if (isinstance(index, list) or isinstance(index, tuple)) else [index]

        key = tuple([DimensionValuePair(dimensions[i], index[i]) for i in range(len(dimensions))])

        sorted_key = sorted(key, key=lambda x: x.dimension)
        serializedKey = '|'.join([f'{dimensionValuePair.dimension}:{dimensionValuePair.value}' for dimensionValuePair in sorted_key])

        currentPeriodValue = PeriodValue(row['count'], row['count'] / comparisonCount, row[metrics_name])
        lastPeriodValue = PeriodValue(row[f'count_baseline'], row['count_baseline'] / baselineCount, row[f'{metrics_name}_baseline'])

        sliceInfo = DimensionSliceInfo(
            key,
            serializedKey,
            [],
            lastPeriodValue,
            currentPeriodValue,
            currentPeriodValue.sliceValue - lastPeriodValue.sliceValue)
        return sliceInfo
    # print(df)
    return df.apply(lambda row: mapToObj(row.name, row), axis=1).tolist()


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

class MetricsController(object):
    def __init__(self,
                 data: pd.DataFrame,
                 baseline_date_range: Tuple[datetime.date, datetime.date],
                 comparison_date_range: Tuple[datetime.date, datetime.date],
                 date_column: str,
                 columns_of_interest: List[str],
                 agg_method: Dict[str, str],
                 metrics_name: Dict[str, str]):
        self.df = data
        self.columns_of_interest = columns_of_interest
        self.agg_method = agg_method
        self.metrics_name = metrics_name
        self.date_column = date_column
        self.baseline_date_range = baseline_date_range
        self.comparison_date_range = comparison_date_range
        self.aggs = analyze(self.df, baseline_date_range, comparison_date_range, date_column, self.columns_of_interest, agg_method, metrics_name)

        self.slices = []
        self.slice(baseline_date_range, comparison_date_range)

    def slice(self, baseline_period, comparison_period):
        for i in range(1, len(self.columns_of_interest) + 1):
            for columns in combinations(self.columns_of_interest, i):
                dimension_slice = analyze(self.df, baseline_period, comparison_period, self.date_column, list(columns), self.agg_method, self.metrics_name)
                self.slices.append(dimension_slice)

    def getDimensions(self) -> Dict[str, Dimension]:
        dimensions = {}
        for column in self.columns_of_interest:
            values = self.df[column].unique()
            values = list(filter(lambda x: x is not None and x is not np.NaN, values))
            dimensions[column] = Dimension(name=column, values=values)
        return dimensions

    def getTopDrivingDimensionSliceKeys(self,
                                        parentSlice: tuple[DimensionValuePair],
                                        slice_info_dict: Dict[frozenset[DimensionValuePair], DimensionSliceInfo],
                                        topN = 1000) -> List[str]:
        """
        Only calculate first level child impact
        """
        parentDimension = [slice.dimension for slice in parentSlice]
        childDimensions = [dimension for dimension in self.columns_of_interest if dimension not in parentDimension]

        childSliceKey = [
            frozenset(
                parentSlice + (DimensionValuePair(dimension, value),)
            )
            for dimension in childDimensions
            for value in self.getDimensions()[dimension].values
        ]

        slice_info = [slice_info_dict[key] for key in childSliceKey if key in slice_info_dict]
        slice_info.sort(key=lambda slice: abs(slice.impact), reverse=True)
        return list(map(lambda slice: slice.serializedKey, slice_info[:topN]))

    def buildMetrics(self, metricsName: str) -> Metrics:
        metrics = Metrics()
        metrics.name = metricsName
        metrics.baselineNumRows = self.aggs['count_baseline'].sum()
        metrics.comparisonNumRows = self.aggs['count'].sum()
        metrics.dimensions = self.getDimensions()

        all_dimension_slices = []
        # Build dimension slice info
        for dimension_slice in self.slices:
            ret = toDimensionSliceInfo(dimension_slice, metricsName, metrics.baselineNumRows, metrics.comparisonNumRows)
            all_dimension_slices.extend(ret)

        all_dimension_slices.sort(key=lambda slice: abs(slice.impact), reverse=True)
        metrics.topDriverSliceKeys = list(map(lambda slice: slice.serializedKey, all_dimension_slices[:1000]))
        metrics.dimensionSliceInfo = { dimension_slice.serializedKey: dimension_slice
                                  for dimension_slice in all_dimension_slices
        }
        metrics.baselineValue = self.aggs[f'{metricsName}_baseline'].sum()
        metrics.comparisonValue = self.aggs[metricsName].sum()

        baseline = self.df.loc[self.df[self.date_column].between(
            pd.to_datetime(self.baseline_date_range[0], utc=True),
            pd.to_datetime(self.baseline_date_range[1], utc=True))
        ].groupby('date').agg(self.agg_method)
        comparison = self.df.loc[self.df[self.date_column].between(
            pd.to_datetime(self.comparison_date_range[0], utc=True),
            pd.to_datetime(self.comparison_date_range[1], utc=True))
        ].groupby('date').agg(self.agg_method)

        metrics.aggregationMethod = self.agg_method[metricsName]
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

        metrics.baselineDateRange = [self.baseline_date_range[0].strftime("%Y-%m-%d"), self.baseline_date_range[1].strftime("%Y-%m-%d")]
        metrics.comparisonDateRange = [self.comparison_date_range[0].strftime("%Y-%m-%d"), self.comparison_date_range[1].strftime("%Y-%m-%d")]

        return metrics

    def getSlices(self):
        return self.slices

    def getMetrics(self) -> str:
        ret = {
            k: asdict(self.buildMetrics(k))
            for k, v in self.metrics_name.items()
            if k != self.date_column
        }

        # revenue = asdict(self.buildMetrics('revenue'))
        # unique_user = asdict(self.buildMetrics('unique_user'))
        # unique_order = asdict(self.buildMetrics('unique_order'))
        # ret = { 'revenue': revenue, 'unique_user': unique_user, 'unique_order': unique_order }
        return json.dumps(ret, cls=NpEncoder)
