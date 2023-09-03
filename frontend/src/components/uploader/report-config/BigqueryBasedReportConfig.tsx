import { useNavigate } from "react-router-dom";
import { BigquerySchema } from "../../../types/data-source";
import {
  ColumnConfig,
  DateRangeConfig,
  MetricColumn,
  TargetDirection,
} from "../../../types/report-config";
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
    dateColumn: string,
    metricColumn: MetricColumn,
    supportingMetricColumn: MetricColumn[],
    groupByColumns: string[],
    baseDateRange: DateRangeConfig,
    comparisonDateRange: DateRangeConfig,
    targetDirection: TargetDirection
  ) => {
    navigate("/dashboard", {
      state: {
        tableName: name,
        dataSourceType: "bigquery",
        metricColumn,
        supportingMetricColumn,
        dateColumn,
        groupByColumns,
        selectedColumns,
        baseDateRange,
        comparisonDateRange,
        targetDirection,
      },
    });
  };

  return (
    <ReportConfig
      schema={schema}
      dataSourceType="bigquery"
      rowCountByColumn={rowCountByColumn}
      onSubmit={onSubmit}
      isUploading={false}
    />
  );
}
