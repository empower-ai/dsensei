from google.cloud import bigquery
from google.cloud.bigquery import Dataset

from app.data_source.datasource import BigquerySchema, Field


class BigquerySource:

    def __init__(self) -> None:
        self.client = bigquery.Client()

    def get_schema(self, full_name: str) -> BigquerySchema:
        table = self.client.get_table(full_name)

        fields = [Field(
            name=field.name,
            description=field.description,
            type=field.field_type,
            mode=field.mode
        ) for field in table.schema]

        selections = ','.join([f'APPROX_COUNT_DISTINCT({field.name}) as {field.name}' for field in fields])
        query = f"""
            SELECT {selections}
            FROM {table.project}.{table.dataset_id}.{table.table_id}
        """
        print(query)
        res = self.client.query(query)
        for row in res:
            print(row.userId)

        schema = BigquerySchema(
            name=table.table_id,
            description=table.description,
            fields=fields,
            isDateSuffixPartitionTable=False
        )

        return schema

    def list_tables(self, dataset: Dataset = None) -> list[BigquerySchema]:
        tables = self.client.list_tables(dataset)
        schemas = []
        for row in tables:
            schema = self.get_schema(row.full_table_id)
            schemas.append(schema)

        return schemas
