import * as rd from "@duckdb/react-duckdb";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createNewDateWithBrowserTimeZone } from "../../../common/utils";
import { Column } from "../../../types/data-source";
import {
  ColumnConfig,
  DateRangeConfig,
  PrefillConfig,
  RowCountByDateAndColumn,
} from "../../../types/report-config";
import ReportConfig from "./ReportConfig";

const sampleDataPrefills: PrefillConfig = {
  selectedColumns: {
    userId: {
      type: "metric",
      aggregationOption: "distinct",
      expectedValue: 0.03,
    },
    eventTime: {
      type: "date",
    },
    country: {
      type: "dimension",
    },
    gender: {
      type: "dimension",
    },
    majorOsVersion: {
      type: "dimension",
    },
    phoneBrand: {
      type: "dimension",
    },
  },
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
  columns: Column[];
  file?: File;
  prefillWithSampleData: boolean;
}

export default function CSVBasedReportConfig({
  columns,
  file,
  prefillWithSampleData,
}: Props) {
  const db = rd.useDuckDB().value!;
  const navigate = useNavigate();

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
        columns
          .filter(
            (column) => column.type === "TIMESTAMP" || column.type === "DATE"
          )
          .map(async (column) => {
            const query = `SELECT COUNT(1) as count, strftime(${column.name}, '%Y-%m-%d') as date
               from uploaded_content group by strftime(${column.name}, '%Y-%m-%d')`;
            const res = await conn.query(query);

            return [
              column.name,
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
      if (columns.length > 0) {
        const conn = await db.connect();

        const res = await conn.query(
          `SELECT ${columns
            .map((column) => `COUNT(DISTINCT ${column.name}) as ${column.name}`)
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
  }, [db, columns]);

  const onSubmit = async (
    selectedColumns: {
      [key: string]: ColumnConfig;
    },
    baseDateRange: DateRangeConfig,
    comparisonDateRange: DateRangeConfig
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
        selectedColumns,
        baseDateRange,
        comparisonDateRange,
      },
    });
  };

  return (
    <ReportConfig
      columns={columns}
      rowCountByColumn={rowCountByColumn}
      rowCountByDateColumn={rowCountByDateAndColumn}
      prefilledConfigs={prefillWithSampleData ? sampleDataPrefills : undefined}
      onSubmit={onSubmit}
      isUploading={isUploading}
    />
  );
}
