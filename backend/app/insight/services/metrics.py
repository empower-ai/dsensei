import hashlib
import itertools
import json
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date
from enum import Enum, StrEnum
from typing import Dict, Iterable, List, Optional

import numpy as np
import orjson
import pandas as pd
import polars as pl
from polars import Expr

pl.Config.set_tbl_cols(20)
pl.Config.set_tbl_rows(30)

pl.Config.set_tbl_rows(30)
pl.Config.set_tbl_cols(30)


class FilterOperator(StrEnum):
    EQ = "eq"
    NEQ = "neq"
    EMPTY = "empty"
    NON_EMPTY = "non_empty"


@dataclass
class Filter:
    column: str
    operator: FilterOperator
    values: Optional[list[str | float | bool | date]] = None


@dataclass
class Dimension:
    name: str
    score: float
    is_key_dimension: bool


@dataclass(frozen=True)
class DimensionValuePair:
    dimension: str = None
    value: str = None


@dataclass
class PeriodValue:
    sliceCount: int = None
    sliceSize: float = None
    sliceValue: float = None


@dataclass
class SegmentInfo:
    key: tuple[DimensionValuePair]
    serializedKey: str
    baselineValue: PeriodValue
    comparisonValue: PeriodValue
    impact: float
    changePercentage: float
    changeDev: Optional[float] = None
    absoluteContribution: Optional[float] = None
    confidence: Optional[float] = None
    sortValue: Optional[float] = None


@dataclass
class ValueByDate:
    date: str
    value: float


class Metric:
    name: str


class AggregateMethod(Enum):
    COUNT = 1
    DISTINCT = 2
    SUM = 3


class CombineMethod(Enum):
    RATIO = 1


@dataclass
class Metric(ABC):
    @abstractmethod
    def get_aggregation_exprs(self, agg_override: Optional[AggregateMethod] = None) -> List[Expr]:
        pass

    @abstractmethod
    def get_id(self):
        pass

    @abstractmethod
    def get_display_name(self):
        pass

    @abstractmethod
    def get_metric_type(self):
        pass

    @abstractmethod
    def get_weight_column_name(self) -> str:
        pass

    @abstractmethod
    def get_sorting_expr(self) -> Expr:
        pass


@dataclass
class SingleColumnMetric(Metric):
    name: Optional[str]
    column: str
    aggregate_method: AggregateMethod
    filters: list[Filter]

    def get_id(self):
        if self.name is not None:
            return self.name

        filters_hash_suffix = ""
        if len(self.filters) > 0:
            filters_in_json = orjson.dumps(
                self.filters, option=orjson.OPT_SORT_KEYS)
            hasher = hashlib.sha1()
            hasher.update(filters_in_json)
            filters_hash_suffix = f"_{hasher.hexdigest()[:6]}"

        return f"{self.column}_{self.aggregate_method.name}{filters_hash_suffix}"

    def get_display_name(self):
        if self.name is not None:
            return self.name

        return f"{self.aggregate_method.name} {self.column}"

    def get_aggregation_exprs(self, agg_override: Optional[AggregateMethod] = None) -> Iterable[Expr]:
        from app.insight.services.utils import get_filter_expression

        col = pl.col(self.column)
        if len(self.filters) > 0:
            col = pl.col(self.column).filter(get_filter_expression(self.filters))
        return [build_polars_agg(col, agg_override if agg_override is not None else self.aggregate_method).alias(self.get_id())]

    def get_metric_type(self):
        return self.aggregate_method.name

    def get_weight_column_name(self) -> str:
        return self.get_id()

    def get_sorting_expr(self) -> Expr:
        return (pl.col(self.get_id()) - pl.col(f"{self.get_id()}_baseline")).abs().alias("sort")


@dataclass
class DualColumnMetric(Metric):
    name: str
    combine_method: CombineMethod
    numerator_metric: SingleColumnMetric
    denominator_metric: SingleColumnMetric

    def __post_init__(self):
        self.numerator_metric.name = f"{self.name} numerator"
        self.denominator_metric.name = f"{self.name} denominator"

    def get_display_name(self):
        return self.name

    def get_id(self):
        return self.name

    def get_aggregation_exprs(self, agg_override: Optional[AggregateMethod] = None) -> Iterable[Expr]:
        numerator_metric_agg_expr = self.numerator_metric.get_aggregation_exprs(agg_override)[
            0]
        denominator_metric_agg_expr = self.denominator_metric.get_aggregation_exprs(
            agg_override)[0]

        return [
            numerator_metric_agg_expr,
            denominator_metric_agg_expr,
            pl.when((denominator_metric_agg_expr == 0) | numerator_metric_agg_expr.is_null() | denominator_metric_agg_expr.is_null())
            .then(0)
            .otherwise(numerator_metric_agg_expr / denominator_metric_agg_expr)
            .alias(self.name)
        ]

    def get_metric_type(self):
        return self.combine_method.name

    def get_weight_column_name(self) -> str:
        return self.numerator_metric.get_id()

    def get_sorting_expr(self) -> Expr:
        return (pl.col(self.numerator_metric.get_id()) - pl.col(f"{self.numerator_metric.get_id()}_baseline")).abs().alias("sort")


@dataclass
class MetricInsight:
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
    dimensionSliceInfo: Dict[str, SegmentInfo] = None
    keyDimensions: List[str] = None
    filters: Dict[str, any] = None


parallel_analysis_executor = ThreadPoolExecutor()


def build_polars_agg(name: str | Expr, method: AggregateMethod):
    col = name
    if name is str:
        col = pl.col(name)
    if method == AggregateMethod.SUM:
        return col.sum()
    elif method == AggregateMethod.COUNT:
        return col.count()
    elif method == AggregateMethod.DISTINCT:
        return col.n_unique().cast(int)


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


def calculate_total_segments(dimensions: Dict[str, Dimension]) -> int:
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
                   (df['metric_value_comparison_sum'] +
                    df['metric_value_baseline_sum'])
    df['change'] = np.where(df['metric_value_baseline'] == 0, 0,
                            (df['metric_value_comparison'] - df['metric_value_baseline']) / df['metric_value_baseline'])

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
