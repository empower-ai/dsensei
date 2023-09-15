import os

import sentry_sdk
from flask import Flask
from flask_appbuilder import SQLA, AppBuilder
from flask_cors import CORS
from sentry_sdk.integrations.flask import FlaskIntegration

from app.index_view import DSenseiIndexView
from config import ConfigKey, get_config

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, static_url_path='')
app.config.from_object(get_config(os.environ.get("FLASK_ENV", "production")))
app.config.from_prefixed_env("FLASK")
app.config.from_prefixed_env("DSENSEI")
CORS(app)
app._static_folder = os.path.abspath("static/")

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app.db')
app.config['CSRF_ENABLED'] = True

if app.config[ConfigKey.ENABLE_TELEMETRY.name]:
    sentry_sdk.init(
        dsn="https://196e3946ca25bbb9c939c14a7daa2da8@o4505710546190336.ingest.sentry.io/4505711370698752",
        integrations=[
            FlaskIntegration(),
        ],

        traces_sample_rate=1.0,
        include_local_variables=False
    )

db = SQLA(app)
appbuilder = AppBuilder(app, db.session, indexview=DSenseiIndexView)
from app.data_source import routes
from app.insight import routes
from app.settings import routes
