from orjson import orjson


def build_error_response(error: str) -> str:
    return orjson.dumps({
        'error': error
    })
