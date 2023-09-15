import orjson
from flask_appbuilder.api import BaseApi, expose

from app import app
from app.settings.service import SettingsService


class SettingsApi(BaseApi):
    base_resource = 'settings'

    settings = SettingsService(app.config).build_settings()

    @expose('settings')
    def get_settings(self):
        return orjson.dumps(self.settings)
