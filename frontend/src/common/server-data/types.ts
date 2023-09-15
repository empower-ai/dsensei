export interface Settings {
  enableTelemetry: Boolean;
  showDebugInfo: Boolean;

  enableBigqueryIntegration: Boolean;
}

export const defaultSettings: Settings = {
  enableTelemetry: false,
  showDebugInfo: false,

  enableBigqueryIntegration: false,
};

export interface ServerData {
  settings: Settings;
}

export const defaultServerData: ServerData = {
  settings: defaultSettings,
};
