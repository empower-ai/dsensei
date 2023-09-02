import json
import os
from dataclasses import asdict
from datetime import datetime

import pandas as pd
import polars
import sentry_sdk
from orjson import orjson
from sentry_sdk.integrations.flask import FlaskIntegration

from app.data_source import bp as data_source_bp
from app.file_upload.services.file_upload import FileUploadService
from app.insight.datasource.bqMetrics import BqMetrics
from app.insight.services.metrics import MetricsController, NpEncoder
from app.insight.services.segmentInsight import get_segment_insight
from config import Config
from flask import Flask, request
from flask_cors import CORS
from loguru import logger

flask_env_value = os.environ.get('FLASK_ENV', '')
if flask_env_value != 'development':
    sentry_sdk.init(
        dsn="https://196e3946ca25bbb9c939c14a7daa2da8@o4505710546190336.ingest.sentry.io/4505711370698752",
        integrations=[
            FlaskIntegration(),
        ],

        traces_sample_rate=1.0,
        include_local_variables=False
    )
app = Flask(__name__, static_url_path='')

app.config.from_object(Config)
app.register_blueprint(data_source_bp)
CORS(app)
app._static_folder = os.path.abspath("static/")

agg_method_map = {
    "sum": "sum",
    "count": "count",
    "distinct": "nunique"
}


@app.route('/')
def main():
    return app.send_static_file('index.html')


@app.route('/dashboard')
def dashboard():
    return app.send_static_file('index.html')


@app.route('/api/bqinsight', methods=['POST'])
def getBqInsight():
    data = request.get_json()

    table_name = data['tableName']
    baseDateRange = data['baseDateRange']
    comparisonDateRange = data['comparisonDateRange']
    selectedColumns = data['selectedColumns']

    baselineStart = datetime.strptime(
        baseDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    baselineEnd = datetime.strptime(
        baseDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonStart = datetime.strptime(
        comparisonDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonEnd = datetime.strptime(
        comparisonDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()

    date_column = list(
        filter(lambda x: x[1]['type'] == 'date', selectedColumns.items()))[0][0].strip()
    date_column_type = list(filter(lambda x: x[1]['type'] == 'date', selectedColumns.items()))[0][1]['fieldType'].strip()

    agg_method = list(filter(lambda x: x[1]['type'] == 'metric' or x[1]
    ['type'] == 'supporting_metric', selectedColumns.items()))
    expected_value = list(filter(lambda x: x[1]['type'] == 'metric', selectedColumns.items()))[
        0][1]['expectedValue']

    metrics_name = {k: k for k, v in agg_method}
    metrics_name.update({date_column: 'count'})
    agg_method = {k: agg_method_map[v['aggregationOption']]
                  for k, v in agg_method}
    dimensions = list(
        filter(lambda x: x[1]['type'] == 'dimension', selectedColumns.items()))
    dimensions = [k for k, v in dimensions]

    bq_metric = BqMetrics(
        table_name=table_name,
        baseline_period=(baselineStart, baselineEnd),
        comparison_period=(comparisonStart, comparisonEnd),
        date_column=date_column,
        date_column_type=date_column_type,
        agg_method=agg_method,
        metrics_name=metrics_name,
        columns=dimensions,
        expected_value=expected_value)
    return bq_metric.get_metrics()


@app.route('/api/segment-insight', methods=['POST'])
def get_time_series():
    data = request.get_json()

    fileId = data['fileId']
    baseDateRange = data['baseDateRange']
    comparisonDateRange = data['comparisonDateRange']
    selectedColumns = data['selectedColumns']

    baselineStart = datetime.strptime(
        baseDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    baselineEnd = datetime.strptime(
        baseDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonStart = datetime.strptime(
        comparisonDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonEnd = datetime.strptime(
        comparisonDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    date_column = list(
        filter(lambda x: x[1]['type'] == 'date', selectedColumns.items())
    )[0][0].strip()

    agg_method = list(filter(lambda x: x[1]['type'] == 'metric' or x[1]
    ['type'] == 'supporting_metric', selectedColumns.items()))

    metrics_name = {k: k for k, v in agg_method}
    metrics_name.update({date_column: 'count'})
    agg_method = {k: agg_method_map[v['aggregationOption']]
                  for k, v in agg_method}
    agg_method.update({date_column: 'count'})

    segment_key = data['segmentKey']
    filtering_clause = polars.lit(True)
    for sub_key in segment_key:
        filtering_clause = filtering_clause & (polars.col(sub_key['dimension']).cast(str).eq(polars.lit(sub_key['value'])))

    df = polars.read_csv(f'/tmp/dsensei/{fileId}') \
        .with_columns(polars.col(date_column).str.slice(0, 10).str.to_date().alias("date")) \
        .filter(filtering_clause)

    return orjson.dumps(
        get_segment_insight(
            df,
            date_column,
            (baselineStart, baselineEnd),
            (comparisonStart, comparisonEnd),
            agg_method,
            metrics_name
        )
    )


@app.route('/api/insight', methods=['POST'])
def getInsight():
    data = request.get_json()
    file_id = data['fileId']
    base_date_range = data['baseDateRange']
    comparison_date_range = data['comparisonDateRange']
    selected_columns = data['selectedColumns']

    baseline_start = datetime.strptime(
        base_date_range['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    baseline_end = datetime.strptime(
        base_date_range['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparison_start = datetime.strptime(
        comparison_date_range['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparison_end = datetime.strptime(
        comparison_date_range['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()

    date_column = list(
        filter(lambda x: x[1]['type'] == 'date', selected_columns.items()))[0][0].strip()

    agg_method = list(filter(lambda x: x[1]['type'] == 'metric' or x[1]
    ['type'] == 'supporting_metric', selected_columns.items()))
    expected_value = list(filter(lambda x: x[1]['type'] == 'metric', selected_columns.items()))[
        0][1]['expectedValue']

    metrics_name = {k: k for k, v in agg_method}
    metrics_name.update({date_column: 'count'})
    agg_method = {k: agg_method_map[v['aggregationOption']]
                  for k, v in agg_method}
    agg_method.update({date_column: 'count'})

    dimensions = list(
        filter(lambda x: x[1]['type'] == 'dimension', selected_columns.items()))
    dimensions = [k for k, v in dimensions]

    logger.info('Reading file')
    df = polars.read_csv(f'/tmp/dsensei/{file_id}') \
        .with_columns(polars.col(date_column).str.slice(0, 10).str.to_date().alias("date"))
    logger.info('File loaded')

    metrics = MetricsController(
        df,
        (baseline_start, baseline_end),
        (comparison_start, comparison_end),
        date_column,
        dimensions,
        agg_method,
        metrics_name,
        expected_value
    )

    return metrics.getMetrics()


@app.route('/api/file_upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return "No file part in the request", 400

    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400

    try:
        file_data = file.read()
        output_dir = "/tmp/dsensei"  # Change the output directory if needed

        # Create an instance of FileProcessor and use its methods
        file_processor = FileUploadService()
        md5 = file_processor.save_file_with_md5(file_data, output_dir)
        return json.dumps({'id': md5}), 200
    except FileExistsError as e:
        return str(e), 409
    except Exception as e:
        print(e)
        return str(e), 500


if __name__ == '__main__':
    app.run(processes=4, port=5001)
