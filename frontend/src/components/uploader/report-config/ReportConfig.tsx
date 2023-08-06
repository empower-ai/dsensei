import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  Bold,
  Button,
  Card,
  Divider,
  Flex,
  Subtitle,
  Text,
  Title,
} from "@tremor/react";
import { useEffect, useState } from "react";
import { Field } from "../../../types/data-source";
import {
  AggregationType,
  ColumnConfig,
  ColumnType,
  DateRangeConfig,
  PrefillConfig,
  RowCountByColumn,
  RowCountByDateAndColumn,
} from "../../../types/report-config";
import DatePicker, { DateRangeData } from "../DatePicker";
import MultiSelector from "../MultiSelector";
import { ExpectedChangeInput } from "../NumberInput";
import SingleSelector from "../SingleSelector";

type Props = {
  columns: Field[];
  rowCountByColumn: RowCountByColumn;
  rowCountByDateColumn: RowCountByDateAndColumn;
  prefilledConfigs?: PrefillConfig;
  isUploading: boolean;
  onSubmit: (
    selectedColumns: {
      [key: string]: ColumnConfig;
    },
    baseDateRange: DateRangeConfig,
    comparisonDateRange: DateRangeConfig
  ) => Promise<void>;
};

function ReportConfig({
  columns: header,
  rowCountByColumn,
  rowCountByDateColumn: rowCountByDateColumns,
  prefilledConfigs,
  isUploading,
  onSubmit,
}: Props) {
  const [selectedColumns, setSelectedColumns] = useState<{
    [k: string]: ColumnConfig;
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

  useEffect(() => {
    if (prefilledConfigs) {
      setSelectedColumns(prefilledConfigs.selectedColumns);
      setBaseDateRangeData({
        range: prefilledConfigs.baseDateRange,
        stats: {},
      });
      setComparisonDateRangeData({
        range: prefilledConfigs.comparisonDateRange,
        stats: {},
      });
    }
  }, [prefilledConfigs]);

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

  const selectedDateColumn = Object.keys(selectedColumns).find(
    (c) => selectedColumns[c]["type"] === "date"
  );

  const dateColumns = header.filter((h) => {
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
        if (Object.keys(rowCountByColumn).length === 0) {
          return true;
        }

        return (
          rowCountByColumn[h] < 100 ||
          rowCountByColumn[h] / rowCountByColumn["totalRowsReserved"] < 0.01
        );
      });
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <Title>Report Config</Title>
      <Divider />
      <div className="flex flex-col gap-4">
        <SingleSelector
          title={
            <Text className="pr-4 text-black">{"Select report type"}</Text>
          }
          labels={["Date Range Comparison Report"]}
          values={["date_range_comparison"]}
          selectedValue={"date_range_comparison"}
          onValueChange={() => {}}
          disabled={true}
          instruction={
            <Text>
              Date range comparison report compares between two date ranges on
              the selected metric and aggregated of the selected group by
              columns. Currently this is the only report type we support.
            </Text>
          }
        />
        {/* Date column selector */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">{"Select date column"}</Text>
          }
          labels={
            dateColumns.length === 0
              ? header.map((h) => h.name)
              : dateColumns.map((h) => h.name)
          }
          values={
            dateColumns.length === 0
              ? header.map((h) => h.name)
              : dateColumns.map((h) => h.name)
          }
          selectedValue={selectedDateColumn ? selectedDateColumn : ""}
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
        {selectedDateColumn && rowCountByDateColumns[selectedDateColumn] && (
          <DatePicker
            title={"Select date ranges"}
            countByDate={rowCountByDateColumns[selectedDateColumn]}
            comparisonDateRangeData={comparisonDateRangeData}
            setComparisonDateRangeData={setComparisonDateRangeData}
            baseDateRangeData={baseDateRangeData}
            setBaseDateRangeData={setBaseDateRangeData}
            defaultBaseDateRange={prefilledConfigs?.baseDateRange}
            defaultComparisonDateRange={prefilledConfigs?.comparisonDateRange}
          />
        )}
        {/* Analysing metric single selector */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              {"Select the metric column"}
            </Text>
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
            </div>
          ))}
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
          title={"Select group by columns"}
          labels={getValidDimensionColumns().map(
            (h) => `${h} - ${rowCountByColumn[h]} distinct values`
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
        <Divider className="my-2" />
        <Accordion className="border-0">
          <AccordionHeader>
            <Title>
              Advanced settings <Bold>[optional]</Bold>
            </Title>
          </AccordionHeader>
          <AccordionBody>
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
                  instance you may want to analyze the number of buyers and
                  orders when analyzing the total sales revenue.
                </Text>
              }
            />
            {Object.keys(selectedColumns)
              .filter((c) => selectedColumns[c]["type"] === "metric")
              .map((m) => (
                <div key={m}>
                  <ExpectedChangeInput
                    key={`${m}-change-input`}
                    defaultValue={selectedColumns[m].expectedValue}
                    onValueChange={(v) =>
                      onSelectMetricExpectedChange(m, parseFloat(v) / 100)
                    }
                  />
                </div>
              ))}
          </AccordionBody>
        </Accordion>
      </div>
      <Flex justifyContent="center" className="flex-col">
        <Divider />
        <Button
          onClick={async () =>
            await onSubmit(
              selectedColumns,
              baseDateRangeData.range,
              comparisonDateRangeData.range
            )
          }
          loading={isUploading}
          disabled={!canSubmit()}
        >
          {isUploading ? "Uploading" : "Submit"}
        </Button>
      </Flex>
    </Card>
  );
}

export default ReportConfig;
