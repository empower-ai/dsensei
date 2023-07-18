from app.insight import bp
from app.insight.datasource.csvSource import CsvSource
from app.insight.services.metrics import MetricsController

csvSource = CsvSource('./data/data.csv')
metrics = MetricsController(csvSource.load())

@bp.route('/')
def index():
    return 'insights'

@bp.route('/metrics')
def getMetrics():
    return metrics.getMetrics()
