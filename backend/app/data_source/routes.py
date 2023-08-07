import json
from dataclasses import asdict

from google.api_core.exceptions import NotFound
from google.auth.exceptions import GoogleAuthError

from app.data_source import bp
from app.data_source.datasource.bigquerySource import BigquerySource

bigquerySource = BigquerySource()


@bp.route('bigquery/schema/<full_name>', methods=['GET'])
def get_schema(full_name: str):
    try:
        return json.dumps(asdict(bigquerySource.get_schema(full_name)), default=str)
    except NotFound as e:
        return json.dumps({
            'error': 'Table not found.'
        }), 404
    except GoogleAuthError as e:
        return json.dumps({
            'error': 'Auth failed.'
        }), 403
    except Exception as e:
        print(e)
        return json.dumps({'error': 'Internal server error.'}), 500


@bp.route('bigquery/dataset', methods=['GET'])
def list_datasets():
    try:
        bigquerySource.list_dataset()
        return ""
    except GoogleAuthError as e:
        return json.dumps({
            'error': str(e)
        }), 403
    except Exception as e:
        print(e.__class__)
        return json.dumps({'error': 'Internal server error.'}), 500
