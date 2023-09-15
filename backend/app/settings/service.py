from flask import Config

from app.settings.models import Settings
from config import ConfigKey


class SettingsService:
    def __init__(self, app_config: Config) -> None:
        self.app_config = app_config

    def build_settings(self) -> Settings:
        return Settings(
            enableTelemetry=self.app_config[ConfigKey.ENABLE_TELEMETRY.name],
            showDebugInfo=self.app_config[ConfigKey.SHOW_DEBUG_INFO.name],
            enableBigqueryIntegration=self.app_config[ConfigKey.ENABLE_BIGQUERY_INTEGRATION.name]
        )
