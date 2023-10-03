import { DateRangePickerValue } from "@tremor/react";
import { Filter } from "../common/types";
import { DateRangeData } from "../components/uploader/DatePicker";
import { FieldType } from "./data-source";

export type ColumnType = "metric" | "supporting_metric" | "dimension" | "date";
export type AggregationType = "sum" | "count" | "nunique" | "ratio";
export type TargetDirection = "increasing" | "decreasing";

export interface SingularMetric {
  columnName?: string;
  aggregationMethod?: AggregationType;
  filters?: Filter[];
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
  metricColumn: MetricColumn;
  dateColumn: string;
  groupByColumns: string[];
  baseDateRange: DateRangePickerValue;
  comparisonDateRange: DateRangePickerValue;
}

export interface DateRangeRelatedData {
  baseDateRangeData: DateRangeData;
  comparisonDateRangeData: DateRangeData;
  rowCountByDateColumn?: RowCountByDateAndColumn;
}
