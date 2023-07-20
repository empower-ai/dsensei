from dataclasses import dataclass, asdict
from typing import List, Dict
import pandas as pd
from itertools import combinations
import json
import numpy as np
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
    baselineValue: float = None
    comparisonValue: float = None
    baselineValueByDate: Dict[str, float] = None
    comparisonValueByDate: Dict[str, float] = None
    baselineDateRange: List[str] = None
    comparisonDateRange: List[str] = None
    topDriverSliceKeys: List[str] = None
    dimensions: Dict[str, Dimension] = None
    dimensionSliceInfo: Dict[str, DimensionSliceInfo] = None

def analyze(df, columns: List[str], agg_method: Dict[str, str], metrics_name: Dict[str, str]):
    all_columns = ['year'] + columns

    agg = df.groupby(all_columns).agg(agg_method)

    agg = agg.rename(columns = metrics_name)
    this_year = agg.loc[2022].copy()
    past_year = agg.loc[2021].copy()
    for metrics_key in metrics_name.values():
        this_year[f'{metrics_key}_last_year'] = past_year[metrics_key]

    this_year['count_last_year'] = past_year['count']
    this_year.fillna(0, inplace=True)

    return this_year

def toDimensionSliceInfo(df: pd.DataFrame, metrics_name) -> Dict[frozenset, DimensionSliceInfo]:
    dimensions = [df.index.name] if df.index.name else list(df.index.names)
    def mapToObj(index, row):
        index = index if (isinstance(index, list) or isinstance(index, tuple)) else [index]

        key = tuple([DimensionValuePair(dimensions[i], index[i]) for i in range(len(dimensions))])
        serializedKey = '_'.join([str(v) for v in index])
        currentPeriodValue = PeriodValue(row['count'], row[metrics_name])
        lastPeriodValue = PeriodValue(row[f'count_last_year'], row[f'{metrics_name}_last_year'])

        sliceInfo = DimensionSliceInfo(
            key,
            serializedKey,
            [],
            lastPeriodValue,
            currentPeriodValue,
            currentPeriodValue.sliceValue - lastPeriodValue.sliceValue)
        return sliceInfo

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
                 columns_of_interest: List[str],
                 agg_method: Dict[str, str],
                 metrics_name: Dict[str, str]):
        self.df = data

        self.columns_of_interest = columns_of_interest
        self.agg_method = agg_method
        self.metrics_name = metrics_name
        self.aggs = analyze(self.df, self.columns_of_interest, agg_method, metrics_name)

        self.slices = []
        self.slice()

    def slice(self):
        for i in range(1, len(self.columns_of_interest) + 1):
            for columns in combinations(self.columns_of_interest, i):
                dimension_slice = analyze(self.df, list(columns), self.agg_method, self.metrics_name)
                self.slices.append(dimension_slice)

    def getDimensions(self) -> Dict[str, Dimension]:
        dimensions = {}
        for column in self.columns_of_interest:
            dimensions[column] = Dimension(name=column, values=self.df[column].unique().tolist())
        return dimensions

    def getTopDrivingDimensionSliceKeys(self,
                                        parentSlice: tuple[DimensionValuePair],
                                        slice_info_dict: Dict[tuple[DimensionValuePair], DimensionSliceInfo],
                                        topN = 10) -> List[str]:
        """
        Only calculate first level child impact
        """
        parentDimension = [slice.dimension for slice in parentSlice]
        childDimensions = [dimension for dimension in self.columns_of_interest if dimension not in parentDimension]
        childSliceKey = [
            tuple(
                parentSlice + (DimensionValuePair(dimension, value),)
            )
            for dimension in childDimensions
            for value in self.getDimensions()[dimension].values
        ]

        slice_info = [slice_info_dict[key] for key in childSliceKey if key in slice_info_dict]
        slice_info.sort(key=lambda slice: slice.impact, reverse=True)
        return list(map(lambda slice: slice.serializedKey, slice_info[:topN]))

    def buildMetrics(self, metricsName: str) -> Metrics:
        metrics = Metrics()
        metrics.name = metricsName
        metrics.dimensions = self.getDimensions()

        all_dimension_slices = []
        # Build dimension slice info
        for dimension_slice in self.slices:
            ret = toDimensionSliceInfo(dimension_slice, metricsName)
            all_dimension_slices.extend(ret)

        slice_info_dict = {
            dimension_slice.key : dimension_slice
            for dimension_slice in all_dimension_slices
        }

        metrics.topDriverSliceKeys = self.getTopDrivingDimensionSliceKeys(
            (),
            slice_info_dict
        )

        def getTopDrivingDimensionSliceKeys(dimension_slice: DimensionSliceInfo):
            dimension_slice.topDrivingDimensionSliceKeys = self.getTopDrivingDimensionSliceKeys(
                dimension_slice.key,
                slice_info_dict
            )
            return dimension_slice

        all_dimension_slices = map(
            getTopDrivingDimensionSliceKeys,
            all_dimension_slices
        )

        metrics.dimensionSliceInfo = { dimension_slice.serializedKey: dimension_slice
                                  for dimension_slice in all_dimension_slices
        }


        metrics.baselineValueByDate = [{
            "date": "2022-01-01",
            "value": self.aggs[f'{metricsName}_last_year'].sum()
        }]
        metrics.comparisonValueByDate = [{
            "date": "2023-01-01",
            "value": self.aggs[metricsName].sum()
        }]
        metrics.baselineDateRange = ['2021-01-01', '2021-12-31']
        metrics.comparisonDateRange = ['2022-01-01', '2022-12-31']

        return metrics

    def getSlices(self):
        return self.slices

    def getMetrics(self) -> str:
        revenue = asdict(self.buildMetrics('revenue'))
        unique_user = asdict(self.buildMetrics('unique_user'))
        unique_order = asdict(self.buildMetrics('unique_order'))
        ret = { 'revenue': revenue, 'unique_user': unique_user, 'unique_order': unique_order }
        return json.dumps(ret, cls=NpEncoder)
