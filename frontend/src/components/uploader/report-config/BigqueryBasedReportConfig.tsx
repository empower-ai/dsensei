import { useNavigate } from "react-router-dom";
import { BigquerySchema } from "../../../types/data-source";
import { ColumnConfig, DateRangeConfig } from "../../../types/report-config";
import ReportConfig from "./ReportConfig";

interface Props {
  schema: BigquerySchema;
}

export default function BigqueryBasedReportConfig({
  schema: { fields },
}: Props) {
  const navigate = useNavigate();
  const rowCountByColumn = Object.fromEntries(
    fields.map((field) => [field.name, field.numDistinctValues])
  );

  const onSubmit = async (
    selectedColumns: {
      [key: string]: ColumnConfig;
    },
    baseDateRange: DateRangeConfig,
    comparisonDateRange: DateRangeConfig
  ) => {
    navigate("/dashboard", {
      state: {
        dataSourceType: "bigquery",
        selectedColumns,
        baseDateRange,
        comparisonDateRange,
      },
    });
  };

  return (
    <ReportConfig
      columns={fields}
      rowCountByColumn={rowCountByColumn}
      onSubmit={onSubmit}
      isUploading={false}
    />
  );
}
