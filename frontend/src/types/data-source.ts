export interface Schema<T> {
  name: string;
  columns: Field[];
  additionalMetaData: T;
}

export type FieldType = "DATE" | "TIMESTAMP" | "VARCHAR" | "FLOAT" | "INTEGER";
export type FieldMode = "NULLABLE" | "REPEATED" | "REQUIRED";

export interface Field {
  name: string;
  description?: string;
  type: FieldType;
  mode: FieldMode;
}

export interface BigQueryMetaData {
  isDateSuffixPartitionTable: boolean;
}
