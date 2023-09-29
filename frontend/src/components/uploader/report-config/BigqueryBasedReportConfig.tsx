import { useNavigate } from "react-router-dom";
import { BigquerySchema } from "../../../types/data-source";
import {
  DateRangeRelatedData,
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
    dateColumn: string,
    dateColumnType: string,
    metricColumn: MetricColumn,
    groupByColumns: string[],
    dateRangeData: DateRangeRelatedData,
    targetDirection: TargetDirection,
    expectedValue: number
  ) => {
    navigate("/dashboard", {
      state: {
        schema,
        rowCountByColumn,
        tableName: name,
        dataSourceType: "bigquery",
        metricColumn,
        dateColumn,
        dateColumnType,
        groupByColumns,
        dateRangeData,
        targetDirection,
        expectedValue,
        filters: [],
      },
    });
  };

  return (
    <ReportConfig
      schema={schema}
      dataSourceType="bigquery"
      rowCountByColumn={rowCountByColumn}
      prefill={() => {}}
      onSubmit={onSubmit}
    />
  );
}
