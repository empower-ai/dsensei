from concurrent.futures import ThreadPoolExecutor, wait

from google.cloud import bigquery
from google.cloud.bigquery.table import RowIterator

from app.data_source.models import Field, Dataset, BigquerySchema

query_executor = ThreadPoolExecutor(max_workers=10)


class BigquerySource:

    def __init__(self) -> None:
        self.client = bigquery.Client()

    @staticmethod
    def convert_field_type(bq_type: str) -> str:
        pass

    def get_schema(self, full_name: str) -> BigquerySchema:
        table = self.client.get_table(full_name)

        selections = ','.join(
            [f'APPROX_COUNT_DISTINCT({field.name}) as {field.name}' for field in table.schema if field.field_type != 'RECORD'])

        num_distinct_value_by_field_res, preview_data_res = self.run_queries_in_parallel([
            f"""
                SELECT {selections}
                FROM `{table.project}.{table.dataset_id}.{table.table_id}`
            """,
            f"""
                SELECT *
                FROM `{table.project}.{table.dataset_id}.{table.table_id}`
                limit 10
            """
        ])
        num_distinct_value_by_field = next(num_distinct_value_by_field_res)
        fields = []
        for field in table.schema:
            fields.append(Field(
                name=field.name,
                description=field.description,
                type=field.field_type,
                mode=field.mode,
                values=[],
                numDistinctValues=num_distinct_value_by_field[field.name]
                if (field.mode != "REPEATED" and field.field_type != "RECORD")
                else 0
            ))

        schema = BigquerySchema(
            name=f"{table.project}.{table.dataset_id}.{table.table_id}",
            countRows=table.num_rows,
            description=table.description,
            fields=fields,
            isDateSuffixPartitionTable=False,
            previewData=[dict(row) for row in preview_data_res]
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

    def run_queries_in_parallel(self, queries) -> list[RowIterator]:
        future_results = [query_executor.submit(
            self.run_query, query) for query in queries]

        wait(future_results)
        return [future.result() for future in future_results]

    def run_query(self, query) -> RowIterator:
        # Run the query and return the results
        query_job = self.client.query(query)
        return query_job.result()
