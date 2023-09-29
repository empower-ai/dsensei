import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  Bold,
  Button,
  Card,
  Divider,
  Flex,
  Text,
  Title,
} from "@tremor/react";
import { useEffect, useState } from "react";
import { getServerData } from "../../../common/server-data/server-data-loader";
import { useTracking } from "../../../common/tracking";
import { DataSourceType, Schema } from "../../../types/data-source";
import {
  DateRangeRelatedData,
  MetricColumn,
  PrefillConfig,
  RowCountByColumn,
  RowCountByDateAndColumn,
  TargetDirection,
} from "../../../types/report-config";
import DatePicker, { DateRangeData } from "../DatePicker";
import MultiSelector from "../MultiSelector";
import { ExpectedChangeInput } from "../NumberInput";
import SingleSelector from "../SingleSelector";
import MetricConfig from "./MetricConfig";

type Props = {
  schema: Schema;
  dataSourceType: DataSourceType;
  rowCountByColumn: RowCountByColumn;
  rowCountByDateColumn?: RowCountByDateAndColumn;
  prefilledConfigs?: PrefillConfig;
  prefill: (sample: "doordash" | "insurance") => void;
  onSubmit: (
    dateColumn: string,
    dateColumnType: string,
    metricColumn: MetricColumn,
    groupByColumns: string[],
    dateRangeData: DateRangeRelatedData,
    targetDirection: TargetDirection,
    expectedValue: number
  ) => Promise<void>;
};

function ReportConfig({
  schema,
  dataSourceType,
  rowCountByColumn,
  rowCountByDateColumn,
  prefilledConfigs,
  prefill,
  onSubmit,
}: Props) {
  const { trackEvent } = useTracking();

  const [dateColumn, setDateColumn] = useState<string>("");
  const [dateColumnType, setDateColumnType] = useState<string>("");
  const [groupByColumns, setGroupByColumns] = useState<string[]>([]);
  const [metricColumn, setMetricColumn] = useState<MetricColumn>();
  const [expectedValue, setExpectedValue] = useState<number>();
  const debugMode = getServerData().settings.showDebugInfo;

  const [comparisonDateRangeData, setComparisonDateRangeData] =
    useState<DateRangeData>({
      range: {},
      stats: {},
    });
  const [baseDateRangeData, setBaseDateRangeData] = useState<DateRangeData>({
    range: {},
    stats: {},
  });
  const [targetDirection, setTargetDirection] =
    useState<TargetDirection>("increasing");

  useEffect(() => {
    if (prefilledConfigs) {
      setMetricColumn(prefilledConfigs.metricColumn);
      setDateColumn(prefilledConfigs.dateColumn);
      setGroupByColumns(prefilledConfigs.groupByColumns);
    }
  }, [prefilledConfigs]);

  const onSelectDateColumn = (dateCol: string) => {
    setDateColumn(dateCol);
    const dateColumnDetail = schema.fields.find(
      (field) => field.name === dateCol
    );
    setDateColumnType(dateColumnDetail?.type ?? "date");

    setBaseDateRangeData({ range: {}, stats: {} });
    setComparisonDateRangeData({ range: {}, stats: {} });
  };

  function getDateColumns() {
    const dateColumnsByType = schema.fields.filter(
      (h) =>
        h.type === "TIMESTAMP" || h.type === "DATE" || h.type === "DATETIME"
    );

    if (dateColumnsByType.length === 0) {
      return schema.fields.filter((h) => {
        const value = schema.previewData[0][h.name];
        if (Number.isNaN(Number(value))) {
          // parse non number string
          return !Number.isNaN(Date.parse(value));
        } else if (
          // seconds
          (Number(value) > 631152000 && Number(value) < 2082758399) ||
          // milli seconds
          (Number(value) > 631152000000 && Number(value) < 2082758399000) ||
          // micro seconds
          (Number(value) > 631152000000000 && Number(value) < 2082758399000000)
        ) {
          // Timestamp between 1990/1/1  and 2035/12/31
          return true;
        } else {
          return false;
        }
      });
    }

    return dateColumnsByType;
  }

  function trackSubmit() {
    const numDimensions = groupByColumns.length;
    const data = {
      numDimensions,
      dataSourceType,
      countRows: schema.countRows,
    };
    trackEvent("Report Submission", data);
  }

  function canSubmit() {
    const isValidSingularMetric =
      metricColumn?.singularMetric?.columnName !== undefined &&
      metricColumn.aggregationOption !== undefined;
    const isValidRatioMetric =
      metricColumn?.ratioMetric?.numerator?.columnName !== undefined &&
      metricColumn?.ratioMetric?.numerator.aggregationMethod !== undefined &&
      metricColumn?.ratioMetric?.denominator?.columnName !== undefined &&
      metricColumn?.ratioMetric?.denominator.aggregationMethod !== undefined;

    const isValidMetric = isValidSingularMetric || isValidRatioMetric;

    const hasDimensionColumn = groupByColumns.length > 0;

    const hasRows =
      !rowCountByDateColumn ||
      ((comparisonDateRangeData.stats.numRows ?? 0) > 0 &&
        (baseDateRangeData.stats.numRows ?? 0) > 0);

    return (
      comparisonDateRangeData.range.from &&
      comparisonDateRangeData.range.to &&
      baseDateRangeData.range.from &&
      baseDateRangeData.range.to &&
      isValidMetric &&
      hasDimensionColumn &&
      hasRows
    );
  }

  function getValidMetricColumns() {
    return schema.fields
      .map((h) => h.name)
      .filter((h) => rowCountByColumn[h] > 0);
  }

  function getValidDimensionColumns() {
    return schema.fields
      .map((h) => h.name)
      .filter(
        (h) =>
          metricColumn?.singularMetric?.columnName !== h &&
          metricColumn?.ratioMetric?.numerator?.columnName !== h &&
          metricColumn?.ratioMetric?.denominator?.columnName !== h
      )
      .filter((h) => dateColumn !== h)
      .filter((h) => {
        if (Object.keys(rowCountByColumn).length === 0) {
          return true;
        }

        return (
          (rowCountByColumn[h] < 100 ||
            rowCountByColumn[h] / schema.countRows < 0.01) &&
          rowCountByColumn[h] > 0
        );
      });
  }

  function renderDatePicker() {
    if (rowCountByDateColumn && !dateColumn) {
      return null;
    }

    let countByDate;
    if (rowCountByDateColumn && dateColumn) {
      countByDate = rowCountByDateColumn[dateColumn];
      if (!countByDate) {
        return null;
      }
    }

    return (
      <DatePicker
        title={"Select date ranges"}
        countByDate={countByDate}
        comparisonDateRangeData={comparisonDateRangeData}
        setComparisonDateRangeData={setComparisonDateRangeData}
        baseDateRangeData={baseDateRangeData}
        setBaseDateRangeData={setBaseDateRangeData}
        defaultBaseDateRange={prefilledConfigs?.baseDateRange}
        defaultComparisonDateRange={prefilledConfigs?.comparisonDateRange}
      />
    );
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <Title>Report Config</Title>
      {debugMode && (
        <Flex
          flexDirection="row"
          justifyContent="center"
          alignItems="start"
          className="gap-y-2 p-2 gap-4"
        >
          <Button
            className="mb-4"
            onClick={() => {
              prefill("doordash");
            }}
          >
            Doordash
          </Button>

          <Button
            className="mb-4"
            onClick={() => {
              prefill("insurance");
            }}
          >
            Insurance
          </Button>
        </Flex>
      )}

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
            getDateColumns().length === 0
              ? schema.fields.map((h) => h.name)
              : getDateColumns().map((h) => h.name)
          }
          values={
            getDateColumns().length === 0
              ? schema.fields.map((h) => h.name)
              : getDateColumns().map((h) => h.name)
          }
          selectedValue={dateColumn ? dateColumn : ""}
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
        {renderDatePicker()}
        {/* Analyzing metric single selector */}
        <MetricConfig
          getValidMetricColumns={getValidMetricColumns}
          metricColumn={metricColumn}
          setMetricColumn={setMetricColumn}
          targetDirection={targetDirection}
          setTargetDirection={setTargetDirection}
        />
        {/* Dimension columns multi selector */}
        <MultiSelector
          title={"Select group by columns"}
          includeSelectAll={true}
          labels={getValidDimensionColumns().map(
            (h) => `${h} - ${rowCountByColumn[h]} distinct values`
          )}
          values={getValidDimensionColumns()}
          selectedValues={groupByColumns}
          onValueChange={(dimensions) => setGroupByColumns(dimensions)}
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
          <AccordionBody className="overflow-auto">
            <ExpectedChangeInput
              defaultValue={expectedValue}
              onValueChange={(v) => setExpectedValue(parseFloat(v) / 100)}
            />
          </AccordionBody>
        </Accordion>
      </div>
      <Flex justifyContent="center" className="flex-col">
        <Divider />
        <Button
          onClick={async () => {
            if (!metricColumn) {
              return;
            }

            trackSubmit();
            await onSubmit(
              dateColumn,
              dateColumnType,
              metricColumn,
              groupByColumns,
              {
                baseDateRangeData,
                comparisonDateRangeData,
                rowCountByDateColumn,
              },
              targetDirection,
              expectedValue ?? 0
            );
          }}
          disabled={!canSubmit()}
        >
          Submit
        </Button>
      </Flex>
    </Card>
  );
}

export default ReportConfig;
