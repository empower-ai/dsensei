import React from "react";
import {
  Col,
  Grid,
  DateRangePicker,
  DateRangePickerValue,
  Text,
} from "@tremor/react";

type DatePickerProps = {
  title: string | null;
  comparisonDateRange: DateRangePickerValue;
  onComparisonDateRangeChange: (value: DateRangePickerValue) => void;
  baseDateRange: DateRangePickerValue;
  onBaseDateRangeChange: (value: DateRangePickerValue) => void;
};

function DatePicker({
  title,
  comparisonDateRange,
  onComparisonDateRangeChange,
  baseDateRange,
  onBaseDateRangeChange,
}: DatePickerProps) {
  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        <Text className="text-black pr-4">{title}</Text>
      </Col>
      <Col className="items-center" numColSpan={3}>
        <DateRangePicker
          className="col-span-3 max-w-full"
          value={comparisonDateRange}
          onValueChange={onComparisonDateRangeChange}
          enableSelect={false}
          placeholder={"Comparison Date range"}
        />
      </Col>
      <Col className="items-center col-start-3" numColSpan={3}>
        <Text className="py-1 pl-2">
          Date range of the period to analyze (comparison period).
        </Text>
        <DateRangePicker
          className="col-span-3 max-w-full"
          value={baseDateRange}
          onValueChange={onBaseDateRangeChange}
          enableSelect={false}
          placeholder={"Base Date range"}
        />
        <Text className="pt-1 pl-2">
          Date range to of the period compare with (base period).
        </Text>
      </Col>
    </Grid>
  );
}

export default DatePicker;
