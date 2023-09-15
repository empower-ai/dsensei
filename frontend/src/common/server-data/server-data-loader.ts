import { ServerData, defaultServerData } from "./types";

let serverData: ServerData | undefined;

export function loadServerData() {
  const appContainer = document.getElementById("root") as HTMLElement;
  const serializedServerData = appContainer.getAttribute("server-data");
  serverData = serializedServerData
    ? JSON.parse(serializedServerData)
    : defaultServerData;
}

export function getServerData(): ServerData {
  if (!serverData) {
    loadServerData();
  }

  return serverData!;
}
