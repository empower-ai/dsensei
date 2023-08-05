export interface Schema<T> {
  name: string;
  columns: Column[];
  additionalMetaData: T;
}

export type DataType = "DATE" | "TIMESTAMP" | "VARCHAR" | "FLOAT" | "INTEGER";

export interface Column {
  name: string;
  description?: string;
  type: DataType;
  nullable: boolean;
}

export interface BigQueryMetaData {
  isSuffixPartitionTable: boolean;
}
