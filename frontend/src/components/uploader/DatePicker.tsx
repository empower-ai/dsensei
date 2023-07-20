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
    <Grid numItems={2}>
      <Col className="flex items-center justify-end">
        <Title className="pr-4">{title}</Title>
      </Col>
      <Col className="flex items-center">
        <div>

          <DateRangePicker
            className="max-w-sm mx-auto"
            value={dateRange}
            onValueChange={onDateRangeChange}
            enableSelect={false}
          />
        </div>
        <DateRangePicker
          className="max-w-sm mx-auto"
          value={compareAgainstDateRange}
          onValueChange={onCompareAgainstDateRangeChange}
          enableSelect={false}
        />
      </Col>
    </Grid>
  );
}

export default DatePicker;
