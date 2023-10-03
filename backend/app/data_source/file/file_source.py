import polars as pl
from loguru import logger

from app import app
from app.data_source.models import Field, DateField, FileSchema
from app.insight.services.utils import load_df_from_csv
from config import ConfigKey


class FileSource:
    data_type_map = {
        "Float64": "FLOAT",
        "Float32": "FLOAT",
        "Int8": "INTEGER",
        "Int16": "INTEGER",
        "Int32": "INTEGER",
        "Int64": "INTEGER",
        "UInt8": "INTEGER",
        "UInt16": "INTEGER",
        "UInt32": "INTEGER",
        "UInt64": "INTEGER",
        "Date": "DATE",
        "Datetime": "DATE",
        "Utf8": "VARCHAR",
        "Boolean": "BOOLEAN"
    }
    temp_file_path = app.config[ConfigKey.TEMP_FILE_PATH.name]

    def __init__(self, file_name):
        self.file_name = file_name

    def load_schema(self) -> FileSchema:
        logger.info("Loading file")
        df = load_df_from_csv(f"{self.temp_file_path}/{self.file_name}")

        logger.info("Calculating distinct values")
        column_to_num_distinct_values = df.select(
            [pl.col(column).n_unique() for column in df.columns]
        ).row(0, named=True)

        column_values_df = pl.concat(
            [df.lazy().select(pl.col(column).unique().limit(500).cast(pl.Utf8).alias("values")).with_columns(pl.lit(column).alias("column"))
             for column, num_distinct_values in column_to_num_distinct_values.items()]) \
            .groupby("column").agg(pl.col("values").explode()).collect()
        column_to_values = {row['column']: row['values'] for row in column_values_df.rows(named=True)}

        logger.info("Calculating total rows")
        count = df.select(pl.col(df.columns[0]).count()).row(0)[0]

        logger.info("Building fields info")
        fields = []
        for column, data_type in zip(df.columns, df.dtypes):
            data_type = self.data_type_map["Datetime" if isinstance(data_type, pl.Datetime) else str(data_type)]
            num_distinct_values = column_to_num_distinct_values[column]

            if data_type != "DATE":
                fields.append(Field(
                    column,
                    description="",
                    type=data_type,
                    mode="NULLABLE",
                    numDistinctValues=num_distinct_values,
                    values=column_to_values[column]
                ))
            else:
                df = df.with_columns(pl.col(column).cast(pl.Date))
                min_date, max_date = df.select([
                    pl.col(column).min().alias("min"),
                    pl.col(column).min().alias("max"),
                ]).row(0)
                num_rows_by_date_df = df.groupby(pl.col(column).cast(pl.Utf8)).agg(pl.count(column).alias("count"))

                fields.append(DateField(
                    column,
                    description="",
                    type=data_type,
                    mode="NULLABLE",
                    numDistinctValues=num_distinct_values,
                    minDate=min_date,
                    maxDate=max_date,
                    numRowsByDate={row[column]: row["count"] for row in num_rows_by_date_df.rows(named=True) if row[column] is not None},
                    values=column_to_values[column]
                ))
        return FileSchema(
            name=self.file_name,
            countRows=count,
            description=None,
            fields=fields,
            previewData=df.limit(10).rows(named=True)
        )
