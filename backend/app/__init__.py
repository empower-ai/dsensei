from flask import Flask
from config import Config
import os
from flask_cors import CORS, cross_origin

from app.insight.datasource.csvSource import CsvSource
from app.insight.services.metrics import MetricsController

import pandas as pd

app = Flask(__name__, static_url_path='')
CORS(app)
# app.config.from_object(Config)
# app._static_folder = os.path.abspath("static/")


columns_of_interest = ['age_group', 'user_gender', "category"]
csvSource = CsvSource('./data/data.csv')

df = csvSource.load()
df['created_at'] = pd.to_datetime(df['created_at'])
df['year'] = df['created_at'].dt.year
df['age_group'] = (df['user_age'] / 10).astype(int) * 10

agg_method = {
    'price': 'sum',
    'user_id': 'nunique',
    'order_id': 'nunique'
}

metrics_name = {
    'price': 'revenue',
    'user_id': 'unique_user',
    'order_id': 'unique_order'
}

metrics = MetricsController(df, columns_of_interest, agg_method, metrics_name)

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
