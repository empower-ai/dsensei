import json
from dataclasses import asdict

from app.data_source import bp
from app.data_source.datasource.bigquerySource import BigquerySource

bigquerySource = BigquerySource()


@bp.route('bigquery/schema/<full_name>', methods=['GET'])
def get_schema(full_name: str):
    return json.dumps(asdict(bigquerySource.get_schema(full_name)), default=str)
