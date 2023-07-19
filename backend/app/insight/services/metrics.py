from dataclasses import dataclass, asdict
from typing import List, Dict
import pandas as pd
from itertools import combinations

@dataclass
class Dimension:
    name: str = None
    values: List[str] = None

@dataclass(frozen=True)
class DimensionValuePair:
    dimension: str = None
    value: str = None

@dataclass(frozen=True)
class DimensionSliceKey:
    dimension_value_pairs: tuple[DimensionValuePair]

@dataclass
class PeriodValue:
    slice_size: float = None
    slice_count: int = None

@dataclass
class DimensionSliceInfo:
    key: DimensionSliceKey = None
    serialized_key: str = None
    top_driver_slice_keys: List[str] = None
    last_period_value: PeriodValue = None
    current_period_value: PeriodValue = None
    impact_score: float = None

@dataclass
class Metrics:
    name: str = None
    baseline_value: float = None
    comparison_value: float = None
    baseline_value_by_date: Dict[str, float] = None
    comparison_value_by_date: Dict[str, float] = None
    baseline_date_range: List[str] = None
    comparison_date_range: List[str] = None
    top_driver_slice_keys: List[str] = None
    dimensions: Dict[str, Dimension] = None
    slice_info: Dict[str, DimensionSliceInfo] = None

def analyze(df, columns: List[str], agg_method: Dict[str, str], metrics_name: Dict[str, str]):
    all_columns = ['year'] + columns

    agg = df.groupby(all_columns).agg(agg_method)

    agg = agg.rename(columns = metrics_name)
    this_year = agg.loc[2022].copy()
    past_year = agg.loc[2021].copy()
    for metrics_key in metrics_name.values():
        this_year[f'{metrics_key}_last_year'] = past_year[metrics_key]
    this_year.fillna(0, inplace=True)

    return this_year

def toDimensionSliceInfo(df: pd.DataFrame, metrics_name) -> Dict[frozenset, DimensionSliceInfo]:
    dimensions = [df.index.name] if df.index.name else list(df.index.names)
    def mapToObj(index, row):
        index = index if (isinstance(index, list) or isinstance(index, tuple)) else [index]

        key = DimensionSliceKey(tuple([DimensionValuePair(dimensions[i], index[i]) for i in range(len(dimensions))]))
        serializedKey = '_'.join([str(v) for v in index])
        currentPeriodValue = PeriodValue(row[metrics_name], row[metrics_name])
        lastPeriodValue = PeriodValue(row[f'{metrics_name}_last_year'], row[f'{metrics_name}_last_year'])

        sliceInfo = DimensionSliceInfo(
            key,
            serializedKey,
            [],
            lastPeriodValue,
            currentPeriodValue,
            currentPeriodValue.slice_count - lastPeriodValue.slice_count)
        return sliceInfo

    return df.apply(lambda row: mapToObj(row.name, row), axis=1).tolist()


class MetricsController(object):
    def __init__(self,
                 data: pd.DataFrame,
                 columns_of_interest: List[str],
                 agg_method: Dict[str, str],
                 metrics_name: Dict[str, str]):
        self.df = data

        self.columns_of_interest = columns_of_interest
        self.agg = analyze(self.df, self.columns_of_interest, agg_method, metrics_name)

        self.slices = []
        self.slice()

    def slice(self):
        for i in range(1, len(self.columns_of_interest) + 1):
            for columns in combinations(self.columns_of_interest, i):
                dimension_slice = analyze(self.df, list(columns))
                self.slices.append(dimension_slice)

    def getDimensions(self) -> Dict[str, Dimension]:
        dimensions = {}
        for column in self.columns_of_interest:
            dimensions[column] = Dimension(name=column, values=self.df[column].unique().tolist())
        return dimensions

    def getTopDrivingDimensionSliceKeys(self,
                                        parentSlice: DimensionSliceKey,
                                        slice_info_dict: Dict[DimensionSliceKey, DimensionSliceInfo],
                                        topN = 5) -> List[str]:
        """
        Only calculate first level child impact
        """
        parentDimension = [slice.dimension for slice in parentSlice.dimension_value_pairs]
        childDimensions = [dimension for dimension in self.columns_of_interest if dimension not in parentDimension]
        childSliceKey = [
            DimensionSliceKey(tuple(
                parentSlice.dimension_value_pairs + (DimensionValuePair(dimension, value),)
            ))
            for dimension in childDimensions
            for value in self.getDimensions()[dimension].values
        ]

        slice_info = [slice_info_dict[key] for key in childSliceKey if key in slice_info_dict]
        slice_info.sort(key=lambda slice: slice.impact_score, reverse=True)
        return list(map(lambda slice: slice.serialized_key, slice_info[:topN]))

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

        metrics.top_driver_slice_keys = self.getTopDrivingDimensionSliceKeys(
            DimensionSliceKey(()),
            slice_info_dict
        )


        def getTopDrivingDimensionSliceKeys(dimension_slice: DimensionSliceInfo):
            dimension_slice.top_driver_slice_keys = self.getTopDrivingDimensionSliceKeys(
                dimension_slice.key,
                slice_info_dict
            )
            return dimension_slice

        all_dimension_slices = map(
            getTopDrivingDimensionSliceKeys,
            all_dimension_slices
        )

        metrics.slice_info = [{ dimension_slice.serialized_key: dimension_slice }
                                  for dimension_slice in all_dimension_slices
                             ]

        metrics.baseline_value_by_date = self.aggs[f'{metricsName}_last_year'].sum()
        metrics.comparison_value_by_date = self.aggs[metricsName].sum()
        metrics.baseline_date_range = ['2021-01-01', '2021-12-31']
        metrics.comparison_date_range = ['2022-01-01', '2022-12-31']



        return metrics

    def getSlices(self):
        return self.slices

    def getMetrics(self) -> dict:
        revenue = asdict(self.buildMetrics('revenue'))
        unique_user = asdict(self.buildMetrics('unique_user'))
        unique_order = asdict(self.buildMetrics('unique_order'))
        return { 'revenue': revenue, 'unique_user': unique_user, 'unique_order': unique_order }
