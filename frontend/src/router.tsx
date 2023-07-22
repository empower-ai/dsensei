import { createBrowserRouter } from "react-router-dom";
import { MainContent } from "./common/MainContent";
import MainDashboard from "./components/main-dashboard/MainDashboard";
import CsvUploader from "./routes/UploadCSV";

export const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: (
      <MainContent>
        <MainDashboard />
      </MainContent>
    ),
  },
  {
    path: "/",
    element: (
      <MainContent>
        <CsvUploader />
      </MainContent>
    ),
  },
]);
