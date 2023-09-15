export interface Schema {
  name: string;
  countRows: number;
  fields: Field[];
  previewData: {
    [key: string]: string;
  }[];
}

export type DataSourceType = "csv" | "bigquery";

export type FieldType =
  | "DATE"
  | "TIMESTAMP"
  | "VARCHAR"
  | "FLOAT"
  | "INTEGER"
  | "DATETIME";
export type FieldMode = "NULLABLE" | "REPEATED" | "REQUIRED";

export interface Field {
  name: string;
  description?: string;
  type: FieldType;
  mode: FieldMode;
  numDistinctValues: number;
}

export interface DateField extends Field {
  minDate: string;
  maxDate: string;
  numRowsByDate: {
    [key: string]: number;
  };
}

export interface BigquerySchema extends Schema {
  isDateSuffixPartitionTable: boolean;
}

export interface CSVSchema extends Schema {
  file: File;
}
