import * as rd from "@duckdb/react-duckdb";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createNewDateWithBrowserTimeZone } from "../../../common/utils";
import { CSVSchema } from "../../../types/data-source";
import {
  ColumnConfig,
  DateRangeConfig,
  PrefillConfig,
  RowCountByDateAndColumn,
  TargetDirection,
} from "../../../types/report-config";
import ReportConfig from "./ReportConfig";

const sampleDataPrefills: PrefillConfig = {
  selectedColumns: {
    userId: {
      type: "metric",
      aggregationOption: "distinct",
      expectedValue: 0.03,
      fieldType: "VARCHAR",
    }
  },
  dateColumn: "eventTime",
  groupByColumns: ["country", "gender", "majorOsVersion", "phoneBrand", "age", "language", "platform"],
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
  const db = rd.useDuckDB().value!;
  const navigate = useNavigate();
  const { fields, file } = schema;

  const [rowCountByDateAndColumn, setRowCountByDateAndColumn] =
    useState<RowCountByDateAndColumn>({});
  const [rowCountByColumn, setRowCountByColumn] = useState<{
    [key: string]: number;
  }>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    async function calculateCountByDateAndColumn() {
      const conn = await db.connect();

      const res = await Promise.all(
        fields
          .filter(
            (field) => field.type === "TIMESTAMP" || field.type === "DATE"
          )
          .map(async (field) => {
            const query = `SELECT COUNT(1) as count, strftime(${field.name}, '%Y-%m-%d') as date
               from uploaded_content group by strftime(${field.name}, '%Y-%m-%d')`;
            const res = await conn.query(query);

            return [
              field.name,
              Object.fromEntries(
                res.toArray().map((row) => {
                  const rowInJson = row.toJSON();
                  return [rowInJson.date, parseInt(rowInJson.count)];
                })
              ),
            ];
          })
      );
      setRowCountByDateAndColumn(Object.fromEntries(res));
    }

    async function calculateDistinctCountByColumn() {
      if (fields.length > 0) {
        const conn = await db.connect();

        const res = await conn.query(
          `SELECT ${fields
            .map((field) => `COUNT(DISTINCT ${field.name}) as ${field.name}`)
            .join(",")}, COUNT(1) as totalRowsReserved from uploaded_content`
        );

        setRowCountByColumn(
          Object.fromEntries(
            Object.entries(res?.toArray()[0].toJSON()).map((entry) => {
              const [column_name, count] = entry;
              return [column_name, parseInt(count as string)];
            })
          )
        );
      }
    }

    calculateDistinctCountByColumn();
    calculateCountByDateAndColumn();
  }, [db, fields]);

  const onSubmit = async (
    selectedColumns: {
      [key: string]: ColumnConfig;
    },
    dateColumn: string,
    groupByColumns: string[],
    baseDateRange: DateRangeConfig,
    comparisonDateRange: DateRangeConfig,
    targetDirection: TargetDirection
  ) => {
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file!);
    const res = await fetch(
      process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:5001/api/file_upload"
        : "/api/file_upload",
      {
        mode: "cors",
        method: "POST",
        body: formData,
      }
    );

    const { id } = await res.json();
    navigate("/dashboard", {
      state: {
        fileId: id,
        dataSourceType: "csv",
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
      dataSourceType="csv"
      rowCountByColumn={rowCountByColumn}
      rowCountByDateColumn={rowCountByDateAndColumn}
      prefilledConfigs={prefillWithSampleData ? sampleDataPrefills : undefined}
      onSubmit={onSubmit}
      isUploading={isUploading}
    />
  );
}
