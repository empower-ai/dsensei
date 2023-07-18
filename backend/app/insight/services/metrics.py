from dataclasses import dataclass
from typing import List, Dict
import pandas as pd

columns_of_interest = ['category', 'product_brand', 'age_group', 'user_state']

@dataclass
class Dimension:
    name: str
    values: List[str]

@dataclass
class DimensionValuePair:
    dimension: str
    value: str

@dataclass
class DimensionSliceKey:
    dimension_value_pairs: List[DimensionValuePair]

@dataclass
class PeriodValue:
    slice_size: float
    slice_count: int

@dataclass
class DimensionSliceInfo:
    key: DimensionSliceKey
    serialized_key: str
    top_driving_dimension_slice_keys: List[DimensionSliceKey]
    last_period_value: PeriodValue
    current_period_value: PeriodValue
    impact_score: float

@dataclass
class Metrics:
    name: str
    last_period_value: PeriodValue
    current_period_value: PeriodValue
    top_driving_dimension_slice_keys: List[DimensionSliceKey]
    dimensions: Dict[str, Dimension]
    slice_info: Dict[str, DimensionSliceInfo]

def analyze(df, columns):
    all_columns = ['year'] + columns

    agg = df.groupby(all_columns).agg({
        'price': 'sum',
        'user_id': 'nunique',
        'order_id': 'nunique'
    })

    agg = agg.rename(columns = {
        'price': 'revenue',
        'user_id': 'unique_user',
        'order_id': 'unique_order'
    })
    result = (agg
        .pct_change() * 100)
    result = result.rename(columns = {
        'revenue': 'revenue_yoy',
        'unique_user': 'unique_user_yoy',
        'unique_order': 'unique_order_yoy'
    })
    past_year = agg.loc[2021]
    this_year = agg.loc[2022]
    result['revenue_last_year'] = past_year['revenue']
    result['revenue_this_year'] = this_year['revenue']
    result['unique_user_last_year'] = past_year['unique_user']
    result['unique_user_this_year'] = this_year['unique_user']
    result['unique_order_last_year'] = past_year['unique_order']
    result['unique_order_this_year'] = this_year['unique_order']

    return result.dropna()

class MetricsController(object):
    def __init__(self, data: pd.DataFrame):
        self.df = data

        self.df['created_at'] = pd.to_datetime(self.df['created_at'])
        self.df['year'] = self.df['created_at'].dt.year
        self.df['age_group'] = (self.df['user_age'] / 10).astype(int) * 10
        self.agg = analyze(self.df, columns_of_interest)
        print(self.agg)

    def getDimensions(self) -> Dict[str, Dimension]:
        dimensions = {}
        for column in columns_of_interest:
            dimensions[column] = Dimension(name=column, values=self.df[column].unique().tolist())
        return dimensions


    def buildMetrics(self, metricsName: str) -> Metrics:
        metrics = Metrics()
        metrics.name = metricsName
        metrics.dimensions = self.getDimensions()


    def getMetrics(self) -> dict:
        return self.getDimensions()


