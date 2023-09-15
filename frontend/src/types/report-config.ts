import { DateRangePickerValue } from "@tremor/react";
import { FieldType } from "./data-source";

export type ColumnType = "metric" | "supporting_metric" | "dimension" | "date";
export type AggregationType = "sum" | "count" | "nunique" | "ratio";
export type TargetDirection = "increasing" | "decreasing";
export type FitleringOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
export interface FilteringConfig {
  column?: string;
  operator?: FitleringOperator;
  value?: string;
}

export interface SingularMetric {
  columnName?: string;
  aggregationMethod?: AggregationType;
  filter?: FilteringConfig;
}

export interface RatioMetric {
  metricName?: string;
  numerator?: SingularMetric;
  denominator?: SingularMetric;
}

export interface MetricColumn {
  aggregationOption?: AggregationType;
  singularMetric?: SingularMetric;
  ratioMetric?: RatioMetric;
  expectedValue?: number;
}

export interface ColumnConfig {
  type: ColumnType;
  fieldType: FieldType;
  aggregationOption?: AggregationType;
  expectedValue?: number;
}

export type DateRangeConfig = DateRangePickerValue;

export type RowCountByDateAndColumn = {
  [key: string]: {
    [key: string]: number;
  };
};

export type RowCountByColumn = {
  [key: string]: number;
};

export interface PrefillConfig {
  selectedColumns: {
    [key: string]: ColumnConfig;
  };
  metricColumn: MetricColumn;
  dateColumn: string;
  groupByColumns: string[];
  baseDateRange: DateRangePickerValue;
  comparisonDateRange: DateRangePickerValue;
}
