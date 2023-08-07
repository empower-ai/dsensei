from google.cloud import bigquery

from app.data_source.datasource import BigquerySchema, Field, Dataset


class BigquerySource:

    def __init__(self) -> None:
        self.client = bigquery.Client()

    @staticmethod
    def convert_field_type(bq_type: str) -> str:
        pass

    def get_schema(self, full_name: str) -> BigquerySchema:
        table = self.client.get_table(full_name)

        selections = ','.join([f'APPROX_COUNT_DISTINCT({field.name}) as {field.name}' for field in table.schema])
        query = f"""
            SELECT {selections}
            FROM `{table.project}.{table.dataset_id}.{table.table_id}`
        """

        num_distinct_value_by_field = next(self.client.query(query).result())

        fields = []
        for field in table.schema:
            fields.append(Field(
                name=field.name,
                description=field.description,
                type=field.field_type,
                mode=field.mode,
                numDistinctValues=num_distinct_value_by_field[field.name]
            ))

        query = f"""
            SELECT *
            FROM `{table.project}.{table.dataset_id}.{table.table_id}`
            limit 10
        """
        preview_rows = self.client.query(query).result()

        schema = BigquerySchema(
            name=table.table_id,
            description=table.description,
            fields=fields,
            isDateSuffixPartitionTable=False,
            previewData=[dict(row) for row in preview_rows]
        )
        return schema

    def list_dataset(self) -> list[Dataset]:
        dataset_list_res = self.client.list_datasets()

        return [Dataset(
            name=dataset.dataset_id,
            project=dataset.project
        )
            for dataset in dataset_list_res]

    def list_tables(self, dataset: Dataset = None) -> list[BigquerySchema]:
        tables = self.client.list_tables(dataset)
        schemas = []
        for row in tables:
            schema = self.get_schema(row.full_table_id)
            schemas.append(schema)

        return schemas
