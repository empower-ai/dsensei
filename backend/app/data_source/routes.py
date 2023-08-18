import json
from dataclasses import asdict

import simplejson
from app.data_source import bp
from app.data_source.datasource.bigquerySource import BigquerySource
from app.data_source.datasource.snowflakeSource import SnowflakeSource
from flask import request
from google.api_core.exceptions import NotFound
from google.auth.exceptions import GoogleAuthError
from loguru import logger

bigquerySource = BigquerySource()


@bp.route('bigquery/schema/<full_name>', methods=['GET'])
def get_schema(full_name: str):
    try:
        return json.dumps(asdict(bigquerySource.get_schema(full_name)), default=str, allow_nan=False)
    except NotFound as e:
        return json.dumps({
            'error': 'Table not found.'
        }), 404
    except GoogleAuthError as e:
        return json.dumps({
            'error': 'Auth failed.'
        }), 403
    except Exception as e:
        logger.error(e)
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
        logger.error(e)
        return json.dumps({'error': 'Internal server error.'}), 500


@bp.route('snowflake/schema', methods=['POST'])
def get_schema_snowflake():
    data = request.get_json()

    username = data['username']
    password = data['password']
    account = data['account']
    warehouse = data['warehouse']
    full_table_name = data['full_table_name']

    try:
        snowflake = SnowflakeSource(
            username=username,
            password=password,
            account=account,
            warehouse=warehouse
        )
        schema = snowflake.get_schema(full_table_name)

        return simplejson.dumps(asdict(schema), default=str, use_decimal=True)
    except Exception as e:
        logger.error(e)
        return json.dumps({'error': 'Internal server error.'}), 500
