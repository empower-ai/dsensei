import { DateRangePickerValue } from "@tremor/react";

export type ColumnType = "metric" | "supporting_metric" | "dimension" | "date";
export type AggregationType = "sum" | "count" | "distinct";

export interface ColumnConfig {
  type: ColumnType;
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
  baseDateRange: DateRangePickerValue;
  comparisonDateRange: DateRangePickerValue;
}
