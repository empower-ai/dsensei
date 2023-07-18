from flask import Blueprint

bp = Blueprint('insight', __name__)

from app.insight import routes
