import json

from flask_appbuilder import expose
from flask_appbuilder.api import BaseApi
from google.api_core.exceptions import NotFound
from google.auth.exceptions import GoogleAuthError
from loguru import logger
from orjson import orjson

from app.common.request_utils import build_error_response
from app.data_source.bigquery.bigquery_source import BigquerySource


class BigQuerySourceApi(BaseApi):
    resource_name = 'source/bigquery'
    bigquery_source = BigquerySource()

    @expose('/schema/<full_name>', methods=['GET'])
    def get_schema(self, full_name: str):
        try:
            return orjson.dumps(self.bigquery_source.get_schema(full_name))
        except NotFound as e:
            return build_error_response('Table not found.'), 404
        except GoogleAuthError as e:
            return build_error_response('Auth failed.'), 403
        except Exception as e:
            logger.exception(e)
            return build_error_response('Internal server error.'), 500

    @expose('/dataset', methods=['GET'])
    def list_datasets(self):
        try:
            return orjson.dumps(self.bigquery_source.list_dataset())
        except GoogleAuthError as e:
            return build_error_response(str(e)), 403
        except Exception as e:
            logger.exception(e)
            return json.dumps({'error': 'Internal server error.'}), 500
