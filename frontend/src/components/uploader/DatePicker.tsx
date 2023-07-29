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
import { useState } from "react";

type DatePickerProps = {
  title: string | null;
  comparisonDateRange: DateRangePickerValue;
  setComparisonDateRange: (value: DateRangePickerValue) => void;
  baseDateRange: DateRangePickerValue;
  setBaseDateRange: (value: DateRangePickerValue) => void;
};

type BaseDateMode = "previous" | "custom";

const oneDayMs = 24 * 60 * 60 * 1000;

function DatePicker({
  title,
  comparisonDateRange,
  setComparisonDateRange,
  baseDateRange,
  setBaseDateRange,
}: DatePickerProps) {
  const [baseDateMode, setBaseDateMode] = useState<BaseDateMode>("previous");

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
      setBaseDateRange(previousPeriodDateRange);
    }
  }

  function onComparisonDateRangeChange(value: DateRangePickerValue) {
    setComparisonDateRange(value);
    updateBaseDateRangeToIfNecessary(baseDateMode, value);
  }

  function onBaseDateRangeChange(value: DateRangePickerValue) {
    setBaseDateRange(value);

    const previousPeriodDateRange =
      getComparisonDateRangePreviousPeriodDateRange(comparisonDateRange);

    if (
      value.to === previousPeriodDateRange.to &&
      value.from === previousPeriodDateRange.from
    ) {
      setBaseDateMode("previous");
    } else {
      setBaseDateMode("custom");
    }
  }

  function onBaseDateModeChange(value: BaseDateMode) {
    setBaseDateMode(value);
    updateBaseDateRangeToIfNecessary(value, comparisonDateRange);
  }

  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        <Text className="text-black pr-4">{title}</Text>
      </Col>
      <Col className="items-center" numColSpan={3}>
        <Text className="text-black">Period to analyze</Text>
      </Col>
      <Col
        className="col-start-3 gap-y-3 flex-col flex justify-start align-start pt-3"
        numColSpan={3}
      >
        <Flex>
          <Text className="w-[20%]">Date Range:</Text>
          <DateRangePicker
            className="col-span-3 max-w-full"
            value={comparisonDateRange}
            onValueChange={onComparisonDateRangeChange}
            enableSelect={false}
            placeholder={"Comparison Date range"}
          />
        </Flex>
        <Text className="text-black">Period to compare with</Text>
        <Flex className="gap-1">
          <Text>Mode:</Text>
          <Select
            value={baseDateMode}
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
            value={baseDateRange}
            onValueChange={onBaseDateRangeChange}
            enableSelect={false}
            placeholder={"Base Date range"}
          />
        </Flex>
      </Col>
    </Grid>
  );
}

export default DatePicker;
