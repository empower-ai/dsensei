import React from "react";
import {
  Col,
  Grid,
  DateRangePicker,
  DateRangePickerValue,
  Title,
} from "@tremor/react";

type DatePickerProps = {
  title: string | null;
  dateRange: DateRangePickerValue;
  onDateRangeChange: (value: DateRangePickerValue) => void;
  compareAgainstDateRange: DateRangePickerValue;
  onCompareAgainstDateRangeChange: (value: DateRangePickerValue) => void;
};

function DatePicker({
  title,
  dateRange,
  onDateRangeChange,
  compareAgainstDateRange,
  onCompareAgainstDateRangeChange,
}: DatePickerProps) {
  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        <Title className="pr-4">{title}</Title>
      </Col>
      <Col className="flex items-center" numColSpan={3}>
        <div>
          <DateRangePicker
            className="max-w-sm mx-auto"
            value={dateRange}
            onValueChange={onDateRangeChange}
            enableSelect={false}
            placeholder={"Date range"}
          />
        </div>
        <DateRangePicker
          className="max-w-sm mx-auto pl-4"
          value={compareAgainstDateRange}
          onValueChange={onCompareAgainstDateRangeChange}
          enableSelect={false}
          placeholder={"Date range (compare against)s"}
        />
      </Col>
    </Grid>
  );
}

export default DatePicker;
