from flask import Blueprint
from flask_cors import CORS

bp = Blueprint('insight', __name__)
CORS(bp)

from app.insight import routes
