import { getServerData } from "./server-data-loader";
import { Settings } from "./types";

export default function getSettings(): Settings {
  return getServerData().settings;
}
