import { useNavigate } from "react-router-dom";
import { BigquerySchema } from "../../../types/data-source";
import { ColumnConfig, DateRangeConfig } from "../../../types/report-config";
import ReportConfig from "./ReportConfig";

interface Props {
  schema: BigquerySchema;
}

export default function BigqueryBasedReportConfig({ schema }: Props) {
  const { name, fields } = schema;
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
        tableName: name,
        dataSourceType: "bigquery",
        selectedColumns,
        baseDateRange,
        comparisonDateRange,
      },
    });
  };

  return (
    <ReportConfig
      schema={schema}
      rowCountByColumn={rowCountByColumn}
      onSubmit={onSubmit}
      isUploading={false}
    />
  );
}
