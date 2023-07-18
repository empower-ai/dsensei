from dataclasses import dataclass, asdict
from typing import List, Dict
import pandas as pd
from itertools import combinations
# columns_of_interest = ['category', 'product_brand', 'age_group', 'user_state', 'user_gender']
columns_of_interest = ['age_group', 'user_state', 'user_gender']
@dataclass
class Dimension:
    name: str = None
    values: List[str] = None

@dataclass
class DimensionValuePair:
    dimension: str = None
    value: str = None

@dataclass
class DimensionSliceKey:
    dimension_value_pairs: List[DimensionValuePair] = None

@dataclass
class PeriodValue:
    slice_size: float = None
    slice_count: int = None

@dataclass
class DimensionSliceInfo:
    key: DimensionSliceKey = None
    serialized_key: str = None
    top_driving_dimension_slice_keys: List[DimensionSliceKey] = None
    last_period_value: PeriodValue = None
    current_period_value: PeriodValue = None
    impact_score: float = None

@dataclass
class Metrics:
    name: str = None
    last_period_value: PeriodValue = None
    current_period_value: PeriodValue = None
    top_driving_dimension_slice_keys: List[DimensionSliceKey] = None
    dimensions: Dict[str, Dimension] = None
    slice_info: Dict[str, DimensionSliceInfo] = None

agg_method = {
    'price': 'sum',
    'user_id': 'nunique',
    'order_id': 'nunique'
}
metrics_name = {
    'price': 'revenue',
    'user_id': 'unique_user',
    'order_id': 'unique_order'
}

def analyze(df, columns):
    all_columns = ['year'] + columns

    agg = df.groupby(all_columns).agg(agg_method)

    agg = agg.rename(columns = metrics_name)
    this_year = agg.loc[2022].copy()
    past_year = agg.loc[2021].copy()
    for metrics_key in metrics_name.values():
        this_year[f'{metrics_key}_last_year'] = past_year[metrics_key]
    this_year.fillna(0, inplace=True)

    return this_year

def toDimensionSliceInfo(df: pd.DataFrame, metrics_name) -> List[DimensionSliceInfo]:
    dimensions = [df.index.name] if df.index.name else list(df.index.names)
    def mapToObj(index, row):
        index = index if (isinstance(index, list) or isinstance(index, tuple)) else [index]

        key = DimensionSliceKey([DimensionValuePair(dimensions[i], index[i]) for i in range(len(dimensions))])
        serializedKey = '_'.join([str(v) for v in index])
        currentPeriodValue = PeriodValue(row[metrics_name], row[metrics_name])
        lastPeriodValue = PeriodValue(row[f'{metrics_name}_last_year'], row[f'{metrics_name}_last_year'])

        return DimensionSliceInfo(
            key,
            serializedKey,
            [],
            lastPeriodValue,
            currentPeriodValue,
            currentPeriodValue.slice_count - lastPeriodValue.slice_count)
    return df.apply(lambda row: mapToObj(row.name, row), axis=1)


class MetricsController(object):
    def __init__(self, data: pd.DataFrame):
        self.df = data

        self.df['created_at'] = pd.to_datetime(self.df['created_at'])
        self.df['year'] = self.df['created_at'].dt.year
        self.df['age_group'] = (self.df['user_age'] / 10).astype(int) * 10
        self.agg = analyze(self.df, columns_of_interest)

        self.slices = []
        self.slice()

    def slice(self):
        for i in range(1, len(columns_of_interest) + 1):
            for columns in combinations(columns_of_interest, i):
                dimension_slice = analyze(self.df, list(columns))
                self.slices.append(dimension_slice)

    def getDimensions(self) -> Dict[str, Dimension]:
        dimensions = {}
        for column in columns_of_interest:
            dimensions[column] = Dimension(name=column, values=self.df[column].unique().tolist())
        return dimensions

    def buildMetrics(self, metricsName: str) -> Metrics:
        metrics = Metrics()
        metrics.name = metricsName
        metrics.dimensions = self.getDimensions()

        all_dimension_slices = []
        # Build dimension slice info
        for dimension_slice in self.slices:
            all_dimension_slices.extend(toDimensionSliceInfo(dimension_slice, metricsName))

        metrics.slice_info = [{ dimension_slice.serialized_key: dimension_slice } for dimension_slice in all_dimension_slices]

        return metrics

    def getSlices(self):
        return self.slices

    def getMetrics(self) -> dict:
        return asdict(self.buildMetrics('revenue'))