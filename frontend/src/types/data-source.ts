export interface Schema {
  name: string;
  fields: Field[];
  previewData: {
    [key: string]: string;
  }[];
}

export type FieldType = "DATE" | "TIMESTAMP" | "VARCHAR" | "FLOAT" | "INTEGER";
export type FieldMode = "NULLABLE" | "REPEATED" | "REQUIRED";

export interface Field {
  name: string;
  description?: string;
  type: FieldType;
  mode: FieldMode;
  numDistinctValues: number;
}

export interface BigquerySchema extends Schema {
  isDateSuffixPartitionTable: boolean;
}

export interface CSVSchema extends Schema {
  file: File;
}
