from flask import Flask
from config import Config
import os
from app.insight import bp as insight_bp


app = Flask(__name__, static_url_path='')
app.config.from_object(Config)
app._static_folder = os.path.abspath("static/")

app.register_blueprint(insight_bp, url_prefix='/insight')


@app.route('/')
def main():
    return app.send_static_file('index.html')
