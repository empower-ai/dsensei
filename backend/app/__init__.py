import json
import os
from datetime import datetime

import pandas as pd
from app.data_source import bp as data_source_bp
from app.file_upload.services.file_upload import FileUploadService
from app.insight.datasource.bqMetrics import BqMetrics
from app.insight.services.metrics import MetricsController
from config import Config
from flask import Flask, request
from flask_cors import CORS
from loguru import logger

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
        agg_method=agg_method,
        metrics_name=metrics_name,
        columns=dimensions,
        expected_value=expected_value)
    return bq_metric.get_metrics()


@app.route('/api/insight', methods=['POST'])
def getInsight():
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
        filter(lambda x: x[1]['type'] == 'date', selectedColumns.items()))[0][0].strip()

    agg_method = list(filter(lambda x: x[1]['type'] == 'metric' or x[1]
                             ['type'] == 'supporting_metric', selectedColumns.items()))
    expected_value = list(filter(lambda x: x[1]['type'] == 'metric', selectedColumns.items()))[
        0][1]['expectedValue']

    metrics_name = {k: k for k, v in agg_method}
    metrics_name.update({date_column: 'count'})
    agg_method = {k: agg_method_map[v['aggregationOption']]
                  for k, v in agg_method}
    agg_method.update({date_column: 'count'})

    dimensions = list(
        filter(lambda x: x[1]['type'] == 'dimension', selectedColumns.items()))
    dimensions = [k for k, v in dimensions]

    logger.info('Reading file')
    df = pd.read_csv(f'/tmp/dsensei/{fileId}')
    logger.info('File loaded')
    df[date_column] = pd.to_datetime(df[date_column], utc=True)
    df['date'] = df[date_column].dt.date

    metrics = MetricsController(
        df,
        (baselineStart, baselineEnd),
        (comparisonStart, comparisonEnd),
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
