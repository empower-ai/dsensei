import { DateRangePickerValue } from "@tremor/react";
import { FieldType } from "./data-source";

export type ColumnType = "metric" | "supporting_metric" | "dimension" | "date";
export type AggregationType = "sum" | "count" | "nunique" | "ratio";
export type TargetDirection = "increasing" | "decreasing";

export interface MetricColumn {
  aggregationOption?: AggregationType;
  columnNames?: string[];
  columnAggregationTypes?: AggregationType[];
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
