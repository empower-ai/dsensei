from flask import Blueprint
from flask_cors import CORS, cross_origin

bp = Blueprint('data-source', __name__, url_prefix='/api/data-source')
CORS(bp)

from app.data_source import routes
