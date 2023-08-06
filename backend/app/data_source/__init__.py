from flask import Blueprint
from flask_cors import CORS, cross_origin

bp = Blueprint('data-source', __name__)
CORS(bp)

from app.data_source import routes
