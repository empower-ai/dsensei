import os

import orjson
from flask import current_app
from flask import render_template
from flask_appbuilder import expose, IndexView

from app.settings.service import SettingsService


class DSenseiIndexView(IndexView):
    route_base = ""

    @staticmethod
    def render_index():
        asset_manifest_file_path = "static/asset-manifest.json"

        bundle_imports = []
        if os.path.exists(asset_manifest_file_path):
            with open(asset_manifest_file_path, 'r') as file:
                bundled_files = orjson.loads(file.read())['entrypoints']

                for bundle_file in bundled_files:
                    extension = os.path.splitext(bundle_file)[1]

                    if extension == ".js":
                        bundle_imports.append(f"<script defer=\"defer\" src=\"{bundle_file}\"></script>")
                    else:
                        bundle_imports.append(f"<link rel=\"stylesheet\" type=\"text/css\" href=\"{bundle_file}\" />")

        server_data = {
            "settings": SettingsService(current_app.config).build_settings()
        }

        return render_template("index.html", bundle_imports=bundle_imports, server_data=orjson.dumps(server_data).decode("utf-8"))

    @expose('/')
    @expose('/dashboard')
    def index(self):
        return self.render_index()
