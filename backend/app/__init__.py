import json
import os
from dataclasses import asdict
from datetime import datetime

import pandas as pd
import polars
import sentry_sdk
from app.data_source import bp as data_source_bp
from app.file_upload.services.file_upload import FileUploadService
from app.insight.datasource.bqMetrics import BqMetrics
from app.insight.services.metrics import MetricsController, NpEncoder
from app.insight.services.segmentInsight import get_segment_insight
from config import Config
from flask import Flask, request
from flask_cors import CORS
from loguru import logger
from orjson import orjson
from sentry_sdk.integrations.flask import FlaskIntegration

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


def parse_data(data):
    baseDateRange = data['baseDateRange']
    comparisonDateRange = data['comparisonDateRange']
    date_column = data['dateColumn']
    # TODO(liuyl): Fix this, right now did not pass this value to backend
    date_column_type = data['dateColumnType'] if 'dateColumnType' in data else 'date'
    group_by_columns = data['groupByColumns']
    metric_column = data['metricColumn']

    baselineStart = datetime.strptime(
        baseDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    baselineEnd = datetime.strptime(
        baseDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonStart = datetime.strptime(
        comparisonDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonEnd = datetime.strptime(
        comparisonDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()

    metrics_name = {metric_column['columnNames']
                    [0]: metric_column['columnNames'][0]}
    agg_method = {metric_column['columnNames']
                  [0]: metric_column['aggregationOption']}
    metrics_name.update({date_column: 'count'})
    agg_method.update({date_column: 'count'})

    # TODO: Fix this, right now did not pass this value to backend
    expected_value = 0

    return (baselineStart, baselineEnd, comparisonStart, comparisonEnd, date_column, date_column_type, agg_method, metrics_name, group_by_columns, expected_value)


@app.route('/api/bqinsight', methods=['POST'])
def getBqInsight():
    data = request.get_json()
    table_name = data['tableName']

    (baselineStart, baselineEnd, comparisonStart, comparisonEnd, date_column, date_column_type,
        agg_method, metrics_name, group_by_columns, expected_value) = parse_data(data)

    bq_metric = BqMetrics(
        table_name=table_name,
        baseline_period=(baselineStart, baselineEnd),
        comparison_period=(comparisonStart, comparisonEnd),
        date_column=date_column,
        date_column_type=date_column_type,
        agg_method=agg_method,
        metrics_name=metrics_name,
        columns=group_by_columns,
        expected_value=expected_value)
    return bq_metric.get_metrics()


@app.route('/api/segment-insight', methods=['POST'])
def get_time_series():
    data = request.get_json()

    fileId = data['fileId']

    (baselineStart, baselineEnd, comparisonStart, comparisonEnd, date_column, date_column_type,
        agg_method, metrics_name, group_by_columns, expected_value) = parse_data(data)

    segment_key = data['segmentKey']
    filtering_clause = polars.lit(True)
    for sub_key in segment_key:
        filtering_clause = filtering_clause & (polars.col(
            sub_key['dimension']).cast(str).eq(polars.lit(sub_key['value'])))

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

    (baselineStart, baselineEnd, comparisonStart, comparisonEnd, date_column, date_column_type,
        agg_method, metrics_name, group_by_columns, expected_value) = parse_data(data)

    logger.info('Reading file')
    df = polars.read_csv(f'/tmp/dsensei/{file_id}') \
        .with_columns(polars.col(date_column).str.slice(0, 10).str.to_date().alias("date"))
    logger.info('File loaded')

    metrics = MetricsController(
        df,
        (baselineStart, baselineEnd),
        (comparisonStart, comparisonEnd),
        date_column,
        group_by_columns,
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
