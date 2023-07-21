from io import StringIO
from flask import Flask, request
from config import Config
import os
from flask_cors import CORS, cross_origin

from app.insight.datasource.csvSource import CsvSource
from app.insight.services.metrics import MetricsController

import pandas as pd
from datetime import datetime

app = Flask(__name__, static_url_path='')
CORS(app)
app.config.from_object(Config)
app._static_folder = os.path.abspath("static/")

columns_of_interest = ['age_group', 'user_gender', 'category', 'product_distribution_center_id', 'user_state']
csvSource = CsvSource('./data/data.csv')

df = csvSource.load()
df['created_at'] = pd.to_datetime(df['created_at'])
df['year'] = df['created_at'].dt.year
df['age_group'] = (df['user_age'] / 10).astype(int) * 10

agg_method = {
    'price': 'sum',
    'user_id': 'nunique',
    'order_id': 'nunique',
    'created_at': 'count'
}
metrics_name = {
    'price': 'price',
    'user_id': 'user_id',
    'order_id': 'order_id',
    'created_at': "count"
}

metrics = MetricsController(
   df,
    (datetime.strptime('2021-03-01', "%Y-%m-%d").date(), datetime.strptime('2021-3-31', "%Y-%m-%d").date()),
    (datetime.strptime('2021-04-01', "%Y-%m-%d").date(), datetime.strptime('2021-4-28', "%Y-%m-%d").date()),
    'created_at',
   columns_of_interest,
   agg_method,
   metrics_name,
   )

@app.after_request
def after_request(response):
  response.headers.add('Access-Control-Allow-Origin', '*')
  response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  return response

@app.route('/a')
def getMetrics():
    # return 'test'
    return metrics.getMetrics()

@app.route('/')
def main():
    return app.send_static_file('index.html')

@app.route('/insight', methods=['POST'])
def getInsight():
    data = request.get_json()


    print(data.keys())

    csvContent = data['csvContent']
    baselineDateRange = data['baselineDateRange']
    comparisonDateRange = data['comparisonDateRange']
    selectedColumns = data['selectedColumns']

    baselineStart = datetime.strptime(baselineDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    baselineEnd = datetime.strptime(baselineDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonStart = datetime.strptime(comparisonDateRange['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
    comparisonEnd = datetime.strptime(comparisonDateRange['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()


    date_column = list(filter(lambda x: x[1]['type'] == 'date', selectedColumns.items()))[0][0]

    agg_method = list(filter(lambda x: x[1]['type'] == 'metric', selectedColumns.items()))
    metrics_name = {k: k for k, v in agg_method}
    metrics_name.update({date_column: 'count'})
    agg_method = {k: v['aggregationOption'] for k, v in agg_method}
    agg_method.update({date_column: 'count'})

    dimensions = list(filter(lambda x: x[1]['type'] == 'dimension', selectedColumns.items()))
    dimensions = [k for k, v in dimensions]

    df = pd.read_csv(StringIO(csvContent))
    df[date_column] = pd.to_datetime(df[date_column])

    metrics = MetricsController(
        df,
        (baselineStart, baselineEnd),
        (comparisonStart, comparisonEnd),
        date_column,
        dimensions,
        agg_method,
        metrics_name,
    )

    return metrics.getMetrics()
        # return 'test'
    # except Exception as e:
    #     e.with_traceback()
    #     print('error')
    #     return 'error'
