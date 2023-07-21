import React, { useState } from "react";
import { Card, Title, Subtitle, DateRangePickerValue } from "@tremor/react";
import SingleSelector from "./SingleSelector";
import MultiSelector from "./MultiSelector";
import DatePicker from "./DatePicker";

type DataConfigProps = {
  header: string[];
  data: {
    [k: string]: string;
  }[];
};

function DataConfig({ header, data }: DataConfigProps) {
  const [selectedColumns, setSelectedColumns] = useState<{
    [k: string]: { type: string; aggregationOption: string | null };
  }>({});
  const [dateRange, setDateRange] = useState<DateRangePickerValue>({});
  const [compareAgainstDateRange, setCompareAgainstDateRange] =
    useState<DateRangePickerValue>({});

  const onSelectMetrics = (metrics: string[]) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    const addedMetrics = metrics.filter(
      (m) =>
        !Object.keys(selectedColumnsClone).includes(m) ||
        (Object.keys(selectedColumnsClone).includes(m) &&
          selectedColumnsClone[m]["type"] !== "metric")
    );
    addedMetrics.map(
      (m) =>
        (selectedColumnsClone[m] = { type: "metric", aggregationOption: "sum" })
    );
    const removedMetrics = Object.keys(selectedColumnsClone).filter(
      (m) =>
        selectedColumnsClone[m]["type"] === "metric" && !metrics.includes(m)
    );
    removedMetrics.map((m) => delete selectedColumnsClone[m]);
    console.log(selectedColumnsClone);
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectMetricAggregationOption = (
    metric: string,
    aggregationOption: string
  ) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    if (selectedColumnsClone[metric]["type"] !== "metric") {
      throw new Error(
        "Invalid aggregation option update on non-metric columns."
      );
    }
    selectedColumnsClone[metric]["aggregationOption"] = aggregationOption;
    console.log(selectedColumnsClone);
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
          aggregationOption: null,
        })
    );
    const removedDimension = Object.keys(selectedColumnsClone).filter(
      (d) =>
        selectedColumnsClone[d]["type"] === "dimension" &&
        !dimensions.includes(d)
    );
    removedDimension.map((m) => delete selectedColumnsClone[m]);
    console.log(selectedColumnsClone);
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
    selectedColumnsClone[dateCol] = { type: "date", aggregationOption: null };
    console.log(selectedColumnsClone);
    setSelectedColumns(selectedColumnsClone);
  };

  const selectedDateCol = Object.keys(selectedColumns).find(
    (c) => selectedColumns[c]["type"] === "date"
  );

  const potentialDateCols = header.filter((h) => {
    const value = data[0][h];
    if (Number.isNaN(Number(value))) {
      // parse non number string
      return !Number.isNaN(Date.parse(value));
    } else if (Number(value) > 631152000) {
      // Timestamp larger than 1990/1/1
      return true;
    } else {
      return false;
    }
  });

  return (
    <Card className="max-w-3xl mx-auto">
      <div className="flex flex-col gap-4">
        <SingleSelector
          title={<Title className="pr-4">{"Select a date column"}</Title>}
          labels={potentialDateCols.length === 0 ? header : potentialDateCols}
          values={potentialDateCols.length === 0 ? header : potentialDateCols}
          selectedValue={selectedDateCol ? selectedDateCol : ""}
          onValueChange={onSelectDateColumn}
        />
        <DatePicker
          title={"Select date ranges"}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          compareAgainstDateRange={compareAgainstDateRange}
          onCompareAgainstDateRangeChange={setCompareAgainstDateRange}
        />
        <MultiSelector
          title={"Select metric columns"}
          labels={header}
          values={header}
          selectedValues={Object.keys(selectedColumns).filter(
            (c) => selectedColumns[c]["type"] === "metric"
          )}
          onValueChange={onSelectMetrics}
        />
        {Object.keys(selectedColumns)
          .filter((c) => selectedColumns[c]["type"] === "metric")
          .map((m) => (
            <SingleSelector
              title={<Subtitle className="pr-4">{m}</Subtitle>}
              labels={["Sum", "Count", "Distinct Count"]}
              values={["sum", "count", "distinct"]}
              selectedValue={selectedColumns[m]["aggregationOption"]!}
              onValueChange={(v) => onSelectMetricAggregationOption(m, v)}
              key={m}
            />
          ))}
        <MultiSelector
          title={"Select dimension columns"}
          labels={header}
          values={header}
          selectedValues={Object.keys(selectedColumns).filter(
            (c) => selectedColumns[c]["type"] === "dimension"
          )}
          onValueChange={onSelectDimension}
        />
      </div>
    </Card>
  );
}

export default DataConfig;
