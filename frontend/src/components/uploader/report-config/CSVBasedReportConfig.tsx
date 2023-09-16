import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createNewDateWithBrowserTimeZone } from "../../../common/utils";
import { CSVSchema, DateField } from "../../../types/data-source";
import {
  DateRangeConfig,
  MetricColumn,
  PrefillConfig,
  RowCountByDateAndColumn,
  TargetDirection,
} from "../../../types/report-config";
import ReportConfig from "./ReportConfig";

const sampleDataPrefills: PrefillConfig = {
  metricColumn: {
    aggregationOption: "nunique",
    singularMetric: {
      columnName: "userId",
      aggregationMethod: "nunique",
    },
  },
  dateColumn: "eventTime",
  groupByColumns: [
    "country",
    "gender",
    "majorOsVersion",
    "phoneBrand",
    "age",
    "language",
    "platform",
  ],
  baseDateRange: {
    from: createNewDateWithBrowserTimeZone("2022-07-01"),
    to: createNewDateWithBrowserTimeZone("2022-07-31"),
  },
  comparisonDateRange: {
    from: createNewDateWithBrowserTimeZone("2022-08-01"),
    to: createNewDateWithBrowserTimeZone("2022-08-31"),
  },
};

interface Props {
  schema: CSVSchema;
  prefillWithSampleData: boolean;
}

export default function CSVBasedReportConfig({
  schema,
  prefillWithSampleData,
}: Props) {
  const navigate = useNavigate();
  const { fields } = schema;

  const [rowCountByDateAndColumn, setRowCountByDateAndColumn] =
    useState<RowCountByDateAndColumn>({});
  const [rowCountByColumn, setRowCountByColumn] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    async function calculateCountByDateAndColumn() {
      setRowCountByDateAndColumn(
        Object.fromEntries(
          Object.values(fields)
            .filter((field) => field.type === "DATE")
            .map((field) => [field.name, (field as DateField).numRowsByDate])
        )
      );
    }

    async function calculateDistinctCountByColumn() {
      setRowCountByColumn(
        Object.fromEntries(
          Object.values(fields).map((field) => [
            field.name,
            field.numDistinctValues,
          ])
        )
      );
    }

    calculateDistinctCountByColumn();
    calculateCountByDateAndColumn();
  }, [fields]);

  const onSubmit = async (
    dateColumn: string,
    dateColumnType: string,
    metricColumn: MetricColumn,
    groupByColumns: string[],
    baseDateRange: DateRangeConfig,
    comparisonDateRange: DateRangeConfig,
    targetDirection: TargetDirection,
    expectedValue: number
  ) => {
    navigate("/dashboard", {
      state: {
        fileId: schema.name,
        schema,
        rowCountByColumn,
        dataSourceType: "csv",
        dateColumn,
        dateColumnType,
        groupByColumns,
        metricColumn,
        baseDateRange,
        comparisonDateRange,
        targetDirection,
        expectedValue,
        filters: [],
      },
    });
  };

  return (
    <ReportConfig
      schema={schema}
      dataSourceType="csv"
      rowCountByColumn={rowCountByColumn}
      rowCountByDateColumn={rowCountByDateAndColumn}
      prefilledConfigs={prefillWithSampleData ? sampleDataPrefills : undefined}
      onSubmit={onSubmit}
    />
  );
}
