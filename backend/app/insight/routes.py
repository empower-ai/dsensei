from app.insight import bp
from app.insight.datasource.csvSource import CsvSource
from app.insight.services.metrics import MetricsController

import pandas as pd

columns_of_interest = ['age_group', 'user_state', 'category']
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

metrics = MetricsController(csvSource.load(), columns_of_interest, agg_method, metrics_name)

@bp.route('/')
def index():
    return 'insights'

@bp.route('/metrics')
def getMetrics():
    return metrics.getMetrics()
