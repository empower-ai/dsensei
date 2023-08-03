import * as rd from "@duckdb/react-duckdb";
import {
  Bold,
  Button,
  Card,
  DateRangePickerValue,
  Divider,
  Flex,
  Subtitle,
  Text,
  Title,
} from "@tremor/react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createNewDateWithBrowserTimeZone } from "../../common/utils";
import DatePicker, { DateRangeData } from "./DatePicker";
import MultiSelector from "./MultiSelector";
import { ExpectedChangeInput } from "./NumberInput";
import SingleSelector from "./SingleSelector";

type DataConfigProps = {
  header: {
    name: string;
    type: string;
  }[];
  file: File | undefined;
  prefillWithSampleData: boolean;
};

type ColumnType = "metric" | "supporting_metric" | "dimension" | "date";
type AggregationType = "sum" | "count" | "distinct";

function DataConfig({ header, file, prefillWithSampleData }: DataConfigProps) {
  const db = rd.useDuckDB().value!;
  const [selectedColumns, setSelectedColumns] = useState<{
    [k: string]: {
      type: ColumnType;
      aggregationOption?: AggregationType;
      expectedValue?: number;
    };
  }>({});
  const [comparisonDateRangeData, setComparisonDateRangeData] =
    useState<DateRangeData>({
      range: {},
      stats: {},
    });
  const [baseDateRangeData, setBaseDateRangeData] = useState<DateRangeData>({
    range: {},
    stats: {},
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [countByDateByColumn, setCountByDateByColumn] = useState<{
    [key: string]: {
      [key: string]: number;
    };
  }>({});
  const [countByColumn, setCountByColumn] = useState<{ [key: string]: number }>(
    {}
  );
  const [defaultBaseDateRange, setDefaultBaseDateRange] =
    useState<DateRangePickerValue>();
  const [defaultComparisonDateRange, setDefaultComparisonDateRange] =
    useState<DateRangePickerValue>();

  const navigate = useNavigate();

  useEffect(() => {
    async function calculateCountByDateByColumn() {
      const conn = await db.connect();

      const res = await Promise.all(
        header
          .filter((h) => h.type === "TIMESTAMP" || h.type === "DATE")
          .map(async (h) => {
            const query = `SELECT COUNT(1) as count, strftime(${h.name}, '%Y-%m-%d') as date from uploaded_content group by strftime(${h.name}, '%Y-%m-%d')`;
            const res = await conn.query(query);

            return [
              h.name,
              Object.fromEntries(
                res.toArray().map((row) => {
                  const rowInJson = row.toJSON();
                  return [rowInJson.date, parseInt(rowInJson.count)];
                })
              ),
            ];
          })
      );
      setCountByDateByColumn(Object.fromEntries(res));

      if (prefillWithSampleData) {
        setSelectedColumns({
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
        });
        setDefaultBaseDateRange({
          from: createNewDateWithBrowserTimeZone("2022-07-01"),
          to: createNewDateWithBrowserTimeZone("2022-07-31"),
        });
        setDefaultComparisonDateRange({
          from: createNewDateWithBrowserTimeZone("2022-08-01"),
          to: createNewDateWithBrowserTimeZone("2022-08-31"),
        });
      }
    }

    async function calculateDistinctCountByColumn() {
      if (header.length > 0) {
        const conn = await db.connect();

        const res = await conn.query(
          `SELECT ${header
            .map((h) => `COUNT(DISTINCT ${h.name}) as ${h.name}`)
            .join(",")}, COUNT(1) as totalRowsReserved from uploaded_content`
        );

        setCountByColumn(
          Object.fromEntries(
            Object.entries(res?.toArray()[0].toJSON()).map((entry) => {
              const [column_name, count] = entry;
              return [column_name, parseInt(count as string)];
            })
          )
        );
      }
    }

    calculateCountByDateByColumn();
    calculateDistinctCountByColumn();
  }, [db, header]);

  const onSelectMetrics = (metrics: string[], type: ColumnType) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    const addedMetrics = metrics.filter(
      (m) =>
        !Object.keys(selectedColumnsClone).includes(m) ||
        (Object.keys(selectedColumnsClone).includes(m) &&
          selectedColumnsClone[m]["type"] !== type)
    );
    addedMetrics.map(
      (m) =>
        (selectedColumnsClone[m] = {
          type,
          aggregationOption: "sum",
          expectedValue: 0.0,
        })
    );
    const removedMetrics = Object.keys(selectedColumnsClone).filter(
      (m) => selectedColumnsClone[m]["type"] === type && !metrics.includes(m)
    );
    removedMetrics.map((m) => delete selectedColumnsClone[m]);
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectMetricAggregationOption = (
    metric: string,
    aggregationOption: AggregationType
  ) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    if (
      selectedColumnsClone[metric]["type"] !== "metric" &&
      selectedColumnsClone[metric]["type"] !== "supporting_metric"
    ) {
      throw new Error(
        "Invalid aggregation option update on non-metric columns."
      );
    }
    selectedColumnsClone[metric]["aggregationOption"] = aggregationOption;
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectMetricExpectedChange = (
    metric: string,
    expectedValue: number
  ) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    if (
      selectedColumnsClone[metric]["type"] !== "metric" &&
      selectedColumnsClone[metric]["type"] !== "supporting_metric"
    ) {
      throw new Error("Invalid default value update on non-metric columns.");
    }
    selectedColumnsClone[metric]["expectedValue"] = expectedValue;
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectDimension = (dimensions: string[]) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    const addedDimensions = dimensions.filter(
      (d) =>
        !Object.keys(selectedColumnsClone).includes(d) ||
        (Object.keys(selectedColumnsClone).includes(d) &&
          selectedColumnsClone[d]["type"] !== "dimension")
    );
    addedDimensions.map(
      (d) =>
        (selectedColumnsClone[d] = {
          type: "dimension",
        })
    );
    const removedDimension = Object.keys(selectedColumnsClone).filter(
      (d) =>
        selectedColumnsClone[d]["type"] === "dimension" &&
        !dimensions.includes(d)
    );
    removedDimension.map((m) => delete selectedColumnsClone[m]);
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectDateColumn = (dateCol: string) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    const prevDateColumns = Object.keys(selectedColumnsClone).filter(
      (m) => selectedColumnsClone[m]["type"] === "date"
    );
    if (prevDateColumns.length > 1) {
      throw new Error("Found more than 1 date columns.");
    }
    prevDateColumns.map((d) => delete selectedColumnsClone[d]);
    selectedColumnsClone[dateCol] = {
      type: "date",
    };
    setSelectedColumns(selectedColumnsClone);

    setBaseDateRangeData({ range: {}, stats: {} });
    setComparisonDateRangeData({ range: {}, stats: {} });
  };

  const selectedDateCol = Object.keys(selectedColumns).find(
    (c) => selectedColumns[c]["type"] === "date"
  );

  const potentialDateCols = header.filter((h) => {
    return h.type === "TIMESTAMP" || h.type === "DATE";
  });

  function canSubmit() {
    const hasMetricColumn =
      Object.values(selectedColumns).filter(
        (column) => column.type === "metric"
      ).length > 0;

    const hasDimensionColumn =
      Object.values(selectedColumns).filter(
        (column) => column.type === "dimension"
      ).length > 0;

    return (
      comparisonDateRangeData.range.from &&
      comparisonDateRangeData.range.to &&
      (comparisonDateRangeData.stats.numRows ?? 0) > 0 &&
      baseDateRangeData.range.from &&
      baseDateRangeData.range.to &&
      (baseDateRangeData.stats.numRows ?? 0) > 0 &&
      hasMetricColumn &&
      hasDimensionColumn
    );
  }

  const handleOnSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
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
        baseDateRange: baseDateRangeData.range,
        comparisonDateRange: comparisonDateRangeData.range,
      },
    });
  };

  function getValidDimensionColumns() {
    return header
      .map((h) => h.name)
      .filter(
        (h) =>
          !(
            selectedColumns.hasOwnProperty(h) &&
            (selectedColumns[h]["type"] === "metric" ||
              selectedColumns[h]["type"] === "supporting_metric")
          )
      )
      .filter((h) => {
        if (Object.keys(countByColumn).length === 0) {
          return true;
        }

        return (
          countByColumn[h] < 100 ||
          countByColumn[h] / countByColumn["totalRowsReserved"] < 0.01
        );
      });
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <Title>Report Config</Title>
      <Divider />
      <div className="flex flex-col gap-4">
        {/* Date column selector */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">{"Select date column"}</Text>
          }
          labels={
            potentialDateCols.length === 0
              ? header.map((h) => h.name)
              : potentialDateCols.map((h) => h.name)
          }
          values={
            potentialDateCols.length === 0
              ? header.map((h) => h.name)
              : potentialDateCols.map((h) => h.name)
          }
          selectedValue={selectedDateCol ? selectedDateCol : ""}
          onValueChange={onSelectDateColumn}
          instruction={
            <Text>
              Choose the column that is parsable to dates. E.g:{" "}
              <Bold>2020-04-13</Bold>. See supported format{" "}
              <a
                target="_blank"
                rel="noreferrer"
                className="text-blue-800 underline"
                href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format"
              >
                here
              </a>
              .
            </Text>
          }
        />
        {/* Date pickers */}
        {selectedDateCol && countByDateByColumn[selectedDateCol] && (
          <DatePicker
            title={"Select date ranges"}
            countByDate={countByDateByColumn[selectedDateCol]}
            comparisonDateRangeData={comparisonDateRangeData}
            setComparisonDateRangeData={setComparisonDateRangeData}
            baseDateRangeData={baseDateRangeData}
            setBaseDateRangeData={setBaseDateRangeData}
            defaultBaseDateRange={defaultBaseDateRange}
            defaultComparisonDateRange={defaultComparisonDateRange}
          />
        )}
        {/* Analysing metric single selector */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">{"Select metric column"}</Text>
          }
          labels={header.map((h) => h.name)}
          values={header.map((h) => h.name)}
          selectedValue={
            Object.keys(selectedColumns).filter(
              (c) => selectedColumns[c]["type"] === "metric"
            ).length > 0
              ? Object.keys(selectedColumns).filter(
                  (c) => selectedColumns[c]["type"] === "metric"
                )[0]
              : ""
          }
          onValueChange={(metric) => onSelectMetrics([metric], "metric")}
        />
        {Object.keys(selectedColumns)
          .filter((c) => selectedColumns[c]["type"] === "metric")
          .map((m) => (
            <div key={m}>
              <SingleSelector
                title={<Subtitle className="pr-4">{m}</Subtitle>}
                labels={["Sum", "Count", "Distinct Count"]}
                values={["sum", "count", "distinct"]}
                selectedValue={selectedColumns[m]["aggregationOption"]!}
                onValueChange={(v) =>
                  onSelectMetricAggregationOption(m, v as AggregationType)
                }
                key={`${m}-selector`}
                instruction={<Text>How to aggregation the metric.</Text>}
              />
              <ExpectedChangeInput
                key={`${m}-change-input`}
                defaultValue={selectedColumns[m].expectedValue}
                onValueChange={(v) =>
                  onSelectMetricExpectedChange(m, parseFloat(v) / 100)
                }
              />
            </div>
          ))}
        {/* Supporting metrics multi selector */}
        <MultiSelector
          title={
            <Text className="pr-4 text-black">
              Select related metric columns <Bold>[optional]</Bold>
            </Text>
          }
          labels={header
            .map((h) => h.name)
            .filter(
              (h) =>
                !(
                  selectedColumns.hasOwnProperty(h) &&
                  selectedColumns[h]["type"] === "metric"
                )
            )}
          values={header
            .map((h) => h.name)
            .filter(
              (h) =>
                !(
                  selectedColumns.hasOwnProperty(h) &&
                  selectedColumns[h]["type"] === "metric"
                )
            )}
          selectedValues={Object.keys(selectedColumns).filter(
            (c) => selectedColumns[c]["type"] === "supporting_metric"
          )}
          onValueChange={(metrics) =>
            onSelectMetrics(metrics, "supporting_metric")
          }
          instruction={
            <Text>
              Optional list of additional metrics to analyze together. For
              instance you may want to analyze the number of buyers and orders
              when analyzing the total sales revenue.
            </Text>
          }
        />
        {Object.keys(selectedColumns)
          .filter((c) => selectedColumns[c]["type"] === "supporting_metric")
          .map((m) => (
            <SingleSelector
              title={<Subtitle className="pr-4">{m}</Subtitle>}
              labels={["Sum", "Count", "Distinct Count"]}
              values={["sum", "count", "distinct"]}
              selectedValue={selectedColumns[m]["aggregationOption"]!}
              onValueChange={(v) =>
                onSelectMetricAggregationOption(m, v as AggregationType)
              }
              key={m}
              instruction={<Text>How to aggregation the metric.</Text>}
            />
          ))}
        {/* Dimension columns multi selector */}
        <MultiSelector
          title={"Select dimension columns"}
          labels={getValidDimensionColumns().map(
            (h) => `${h} - ${countByColumn[h]} distinct values`
          )}
          values={getValidDimensionColumns()}
          selectedValues={Object.keys(selectedColumns).filter(
            (c) => selectedColumns[c]["type"] === "dimension"
          )}
          onValueChange={onSelectDimension}
          instruction={
            <Text>
              A list of column to aggregate the metrics based on. For instance
              user demographics (gender, age group, ...), product attributes
              (brand, category, ...).
            </Text>
          }
        />
      </div>
      <Flex justifyContent="center" className="flex-col">
        <Divider />
        <Button
          onClick={(e) => {
            handleOnSubmit(e);
          }}
          loading={isUploading}
          disabled={!canSubmit()}
        >
          {isUploading ? "Uploading" : "Submit"}
        </Button>
      </Flex>
    </Card>
  );
}

export default DataConfig;
