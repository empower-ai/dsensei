from flask import Blueprint
from flask_cors import CORS, cross_origin

bp = Blueprint('insight', __name__)
CORS(bp)

from app.insight import routes
