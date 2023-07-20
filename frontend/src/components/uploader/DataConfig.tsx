import React, { useState } from "react";
import {
  Card,
  DateRangePickerValue,
} from "@tremor/react";
import SingleSelector from "./SingleSelector";
import MultiSelector from "./MultiSelector";
import DatePicker from "./DatePicker";

function DataConfig({ header }: { header: string[] }) {
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

  return (
    <Card className="max-w-3xl mx-auto">
      <div className="flex flex-col gap-4">
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
              title={m}
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
        <SingleSelector
          title={"Select a date column"}
          labels={header}
          values={header}
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
      </div>
    </Card>
  );
}

export default DataConfig;
