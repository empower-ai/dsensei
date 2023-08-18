from concurrent.futures import ThreadPoolExecutor, wait

from snowflake.connector.cursor import SnowflakeCursor

from app.data_source.datasource import SnowflakeSchema, Field

import snowflake.connector

query_executor = ThreadPoolExecutor(max_workers=10)


class SnowflakeSource:

    def __init__(self, username: str, password: str, account: str, warehouse: str) -> None:
        self.conn = snowflake.connector.connect(
            user=username,
            password=password,
            account=account,
            warehouse=warehouse
        )

    def get_schema(self, full_name: str) -> SnowflakeSchema:
        query = f"DESCRIBE TABLE {full_name}"
        result = self.run_query(query)
        field_names = [(row[0], row[1].split('(')[0], row[2], row[3], row[4]) for row in result]

        selections = ','.join(
            [f'APPROX_COUNT_DISTINCT({field_name[0]}) as {field_name[0]}' for field_name in field_names
             if field_name[1] != 'VARIANT' and field_name[1] != 'ARRAY' and field_name[1] != 'OBJECT'
             ])

        num_distinct_value_by_field_res, preview_data_res, total_rows_res = self.run_queries_in_parallel([
            f"""
                SELECT {selections}
                FROM TABLE('{full_name}')
            """,
            f"""
                SELECT *
                FROM TABLE('{full_name}')
                limit 10
            """,
            f"""
                SELECT COUNT(1)
                FROM TABLE('{full_name}')
            """
        ])

        # num distinct value by field
        num_distinct_value_by_field = {}
        headers = num_distinct_value_by_field_res.description
        row = num_distinct_value_by_field_res.fetchone()
        if row is not None:
            for i, column_value in enumerate(row):
                num_distinct_value_by_field[headers[i][0]] = column_value

        # preview data
        preview_data = []
        headers = preview_data_res.description
        for row in preview_data_res:
            row_map = {}
            for i, column_value in enumerate(row):
                row_map[headers[i][0]] = column_value
            preview_data.append(row_map)

        fields = []
        for field in field_names:
            fields.append(Field(
                name=field[0],
                description='',
                type=field[1],
                mode='NULLABLE',
                numDistinctValues=num_distinct_value_by_field[field[0]]
                if (field[1] != 'VARIANT' and field[1] != 'ARRAY' and field[1] != 'OBJECT')
                else 0
            ))

        schema = SnowflakeSchema(
            name=f"{full_name}",
            countRows=total_rows_res.fetchone()[0],
            description='',  # table.description,
            fields=fields,
            previewData=preview_data  # [dict(row) for row in preview_data_res]
        )
        return schema

    def run_queries_in_parallel(self, queries) -> list[SnowflakeCursor]:
        future_results = [query_executor.submit(
            self.run_query, query) for query in queries]

        wait(future_results)
        return [future.result() for future in future_results]

    def run_query(self, query) -> SnowflakeCursor:
        return self.conn.cursor().execute(query)
