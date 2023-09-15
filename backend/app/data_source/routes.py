from app import appbuilder
from app.data_source.bigquery.api import BigQuerySourceApi
from app.data_source.file.api import FileSourceApi

appbuilder.add_api(FileSourceApi())
appbuilder.add_api(BigQuerySourceApi())
