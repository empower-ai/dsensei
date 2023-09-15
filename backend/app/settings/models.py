from dataclasses import dataclass


@dataclass
class Settings:
    enableTelemetry: bool
    showDebugInfo: bool

    # integrations
    enableBigqueryIntegration: bool
