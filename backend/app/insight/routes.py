from app.insight import bp


@bp.route('/')
def index():
    return 'insights'
