from enum import Enum


class ConfigKey(Enum):
    TEMP_FILE_PATH = "TEMP_FILE_PATH"
    ENABLE_TELEMETRY = "ENABLE_TELEMETRY"
    SHOW_DEBUG_INFO = "SHOW_DEBUG_INFO"

    ENABLE_BIGQUERY_INTEGRATION = "ENABLE_BIGQUERY_INTEGRATION"


class CommonConfig:
    SECRET_KEY = "dsensei"

    FAB_ADD_SECURITY_VIEWS = False
    TEMP_FILE_PATH = "/tmp/dsensei"


class DevConfig(CommonConfig):
    FAB_ADD_SECURITY_VIEWS = False

    ENABLE_TELEMETRY = False
    SHOW_DEBUG_INFO = True

    ENABLE_BIGQUERY_INTEGRATION = True


class ProdConfig(CommonConfig):
    FAB_ADD_SECURITY_VIEWS = False

    ENABLE_TELEMETRY = True
    SHOW_DEBUG_INFO = False

    ENABLE_BIGQUERY_INTEGRATION = False


def get_config(env: str):
    if env == "development":
        return DevConfig()
    else:
        return ProdConfig()
