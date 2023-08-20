import "preline";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./router";
import { store } from "./store";

import * as duckdb from "@duckdb/duckdb-wasm";
import {
  DuckDBConnectionProvider,
  DuckDBPlatform,
  DuckDBProvider,
} from "@duckdb/react-duckdb";

import duckdb_wasm_coi from "@duckdb/duckdb-wasm/dist/duckdb-coi.wasm";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm";

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: new URL(
      "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js",
      import.meta.url
    ).toString(),
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: new URL(
      "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js",
      import.meta.url
    ).toString(),
  },
  coi: {
    mainModule: duckdb_wasm_coi,
    mainWorker: new URL(
      "@duckdb/duckdb-wasm/dist/duckdb-browser-coi.worker.js",
      import.meta.url
    ).toString(),
    pthreadWorker: new URL(
      "@duckdb/duckdb-wasm/dist/duckdb-browser-coi.pthread.worker.js",
      import.meta.url
    ).toString(),
  },
};
const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <DuckDBPlatform logger={logger} bundles={DUCKDB_BUNDLES}>
    <DuckDBProvider>
      <DuckDBConnectionProvider>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </DuckDBConnectionProvider>
    </DuckDBProvider>
  </DuckDBPlatform>
);
