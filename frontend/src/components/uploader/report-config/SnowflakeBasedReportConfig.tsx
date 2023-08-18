import { useNavigate } from "react-router-dom";
import { SnowflakeSchema } from "../../../types/data-source";
import { ColumnConfig, DateRangeConfig } from "../../../types/report-config";
import ReportConfig from "./ReportConfig";

interface Props {
  schema: SnowflakeSchema;
}

export default function SnowflakeBasedReportConfig({ schema }: Props) {
  const { name, fields } = schema;

  console.log(schema);

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
        dataSourceType: "snowflake",
        selectedColumns,
        baseDateRange,
        comparisonDateRange,
      },
    });
  };

  return (
    <ReportConfig
      schema={schema}
      dataSourceType="snowflake"
      rowCountByColumn={rowCountByColumn}
      onSubmit={onSubmit}
      isUploading={false}
    />
  );
}
