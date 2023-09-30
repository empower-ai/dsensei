from flask import request
from flask_appbuilder.api import BaseApi, expose
from loguru import logger
from orjson import orjson

from app.common.request_utils import build_error_response
from app.data_source.file.file_source import FileSource
from app.data_source.file.file_upload_service import FileUploadService


class FileSourceApi(BaseApi):
    resource_name = 'source/file'

    @expose('/schema', methods=['POST'])
    def load_schema(self):
        logger.info("Loading file from request")
        if 'file' not in request.files:
            return build_error_response("No file part in the request"), 400
        file = request.files['file']
        if file.filename == '':
            return build_error_response("No selected file"), 400

        try:
            logger.info("Saving file to disk")
            file_data = file.read()
            output_dir = "/tmp/dsensei"

            file_processor = FileUploadService()
            md5 = file_processor.save_file_with_md5(file_data, output_dir)

            schema = FileSource(md5).load_schema()
            return orjson.dumps(schema, option=orjson.OPT_NON_STR_KEYS), 200
        except FileExistsError as e:
            return build_error_response(str(e)), 409
        except Exception as e:
            logger.exception(e)
            return build_error_response(str(e)), 500
