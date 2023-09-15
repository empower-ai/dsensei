import "preline";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { loadServerData } from "./common/server-data/server-data-loader";
import "./index.css";
import { router } from "./router";
import { store } from "./store";

const appContainer = document.getElementById("root") as HTMLElement;
const app = ReactDOM.createRoot(appContainer);

loadServerData();

app.render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);
