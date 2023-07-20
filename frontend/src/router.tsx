import App from "./routes/App";
import CsvUploader from "./routes/UploadCSV";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "upload_csv",
    element: <CsvUploader />,
  },
]);
