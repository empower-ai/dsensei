import {
  Col,
  DateRangePicker,
  DateRangePickerValue,
  Flex,
  Grid,
  Select,
  SelectItem,
  Text,
} from "@tremor/react";
import moment from "moment";
import { useState } from "react";

export interface DateRangeStats {
  numDays?: number;
  numRows?: number;
}

export interface DateRangeData {
  range: DateRangePickerValue;
  stats: DateRangeStats;
}

type DatePickerProps = {
  title: string | null;
  comparisonDateRangeData: DateRangeData;
  setComparisonDateRangeData: (value: DateRangeData) => void;
  baseDateRangeData: DateRangeData;
  setBaseDateRangeData: (value: DateRangeData) => void;
  countByDate: {
    [key: string]: number;
  };
};

type BaseDateMode = "previous" | "custom";

const oneDayMs = 24 * 60 * 60 * 1000;

function DatePicker({
  title,
  comparisonDateRangeData,
  setComparisonDateRangeData,
  baseDateRangeData,
  setBaseDateRangeData,
  countByDate,
}: DatePickerProps) {
  const [baseDateRangeMode, setBaseDateRangeMode] =
    useState<BaseDateMode>("previous");

  function getComparisonDateRangePreviousPeriodDateRange(
    comparisonDateRange: DateRangePickerValue
  ): DateRangePickerValue {
    const { from: fromDate, to: toDate } = comparisonDateRange;
    if (fromDate && toDate) {
      const timeDiffMs = Math.abs(toDate.getTime() - fromDate.getTime());
      const days = Math.floor(timeDiffMs / oneDayMs);

      const previousPeriodFromDate = new Date(fromDate);
      previousPeriodFromDate.setDate(fromDate.getDate() - 1 - days);
      const previousPeriodToDate = new Date(fromDate);
      previousPeriodToDate.setDate(fromDate.getDate() - 1);

      return {
        from: previousPeriodFromDate,
        to: previousPeriodToDate,
      };
    }

    return {};
  }

  function renderDateRangeStats(dateRangeStats: DateRangeStats) {
    if (dateRangeStats.numDays) {
      return (
        <Text>
          ({dateRangeStats.numDays} days and {dateRangeStats.numRows ?? 0} rows
          selected)
        </Text>
      );
    }
    return null;
  }

  function getStatsForDateRange(
    dateRange: DateRangePickerValue
  ): DateRangeStats {
    const { from: fromDate, to: toDate } = dateRange;
    if (fromDate && toDate) {
      const timeDiffMs = Math.abs(toDate.getTime() - fromDate.getTime());
      const numDays = Math.floor(timeDiffMs / oneDayMs);

      const date = new Date(fromDate);
      let numRows = 0;
      while (
        moment(date).format("YYYY-MM-DD") !==
        moment(toDate).format("YYYY-MM-DD")
      ) {
        numRows += countByDate[moment(date).format("YYYY-MM-DD")] ?? 0;
        date.setDate(date.getDate() + 1);
      }

      return {
        numDays,
        numRows,
      };
    }

    return {};
  }

  function updateBaseDateRangeToIfNecessary(
    baseDateMode: BaseDateMode,
    comparisonDateRange: DateRangePickerValue
  ) {
    if (baseDateMode === "custom") {
      return;
    }

    const previousPeriodDateRange =
      getComparisonDateRangePreviousPeriodDateRange(comparisonDateRange);

    if (previousPeriodDateRange.to && previousPeriodDateRange.from) {
      setBaseDateRangeData({
        range: previousPeriodDateRange,
        stats: getStatsForDateRange(previousPeriodDateRange),
      });
    }
  }

  function onComparisonDateRangeChange(value: DateRangePickerValue) {
    setComparisonDateRangeData({
      range: value,
      stats: getStatsForDateRange(value),
    });
    updateBaseDateRangeToIfNecessary(baseDateRangeMode, value);
  }

  function onBaseDateRangeChange(value: DateRangePickerValue) {
    setBaseDateRangeData({
      range: value,
      stats: getStatsForDateRange(value),
    });

    const previousPeriodDateRange =
      getComparisonDateRangePreviousPeriodDateRange(
        comparisonDateRangeData.range
      );

    if (
      value.to === previousPeriodDateRange.to &&
      value.from === previousPeriodDateRange.from
    ) {
      setBaseDateRangeMode("previous");
    } else {
      setBaseDateRangeMode("custom");
    }
  }

  function onBaseDateModeChange(value: BaseDateMode) {
    setBaseDateRangeMode(value);
    updateBaseDateRangeToIfNecessary(value, comparisonDateRangeData.range);
  }

  function shouldDisplayWarning() {
    return (
      (((baseDateRangeData.stats.numDays ?? 0) > 0 &&
        baseDateRangeData.stats.numRows) ??
        0) === 0 ||
      (((comparisonDateRangeData.stats.numDays ?? 0) > 0 &&
        comparisonDateRangeData.stats.numRows) ??
        0) === 0
    );
  }

  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        <Text className="text-black pr-4">{title}</Text>
      </Col>
      <Col className="items-center" numColSpan={3}>
        <Flex justifyContent="start" className="gap-1">
          <Text className="text-black">Period to analyze</Text>
          {renderDateRangeStats(comparisonDateRangeData.stats)}
        </Flex>
      </Col>
      <Col
        className="col-start-3 gap-y-3 flex-col flex justify-start align-start pt-3"
        numColSpan={3}
      >
        <Flex>
          <Text className="w-[20%]">Date Range:</Text>
          <DateRangePicker
            className="col-span-3 max-w-full"
            value={comparisonDateRangeData.range}
            onValueChange={onComparisonDateRangeChange}
            enableSelect={false}
            placeholder={"Comparison Date range"}
          />
        </Flex>
        <Flex justifyContent="start" className="gap-1">
          <Text className="text-black">Period to compare with</Text>
          {renderDateRangeStats(baseDateRangeData.stats)}
        </Flex>
        <Flex className="gap-1">
          <Text>Mode:</Text>
          <Select
            value={baseDateRangeMode}
            className="w-[30%] min-w-[30%]"
            onValueChange={(value) =>
              onBaseDateModeChange(value as BaseDateMode)
            }
          >
            <SelectItem value="previous">Previous period</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </Select>
          <Text className="w-[30%]">Date Range:</Text>
          <DateRangePicker
            value={baseDateRangeData.range}
            onValueChange={onBaseDateRangeChange}
            enableSelect={false}
            placeholder={"Base Date range"}
          />
        </Flex>
        {shouldDisplayWarning() && (
          <Text className="text-red-500">
            Please ensure that each period contains more than 0 rows of data.
          </Text>
        )}
      </Col>
    </Grid>
  );
}

export default DatePicker;
