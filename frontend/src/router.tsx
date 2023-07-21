import MainDashboard from "./components/main-dashboard/MainDashboard";
import CsvUploader from "./routes/UploadCSV";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: <MainDashboard />,
  },
  {
    path: "upload_csv",
    element: <CsvUploader />,
  },
]);
