import React, { ReactElement } from "react";
import { Grid, Col, Select, SelectItem, Title, Text } from "@tremor/react";

type SingleSelectorProps = {
  title: ReactElement | null;
  labels: string[];
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  instruction?: ReactElement;
};

function SingleSelector({
  title,
  labels,
  values,
  selectedValue,
  onValueChange,
  instruction,
}: SingleSelectorProps) {
  const options = values.map((v, i) => (
    <SelectItem value={v} key={v}>
      {labels[i]}
    </SelectItem>
  ));
  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        {title}
      </Col>
      <Col className="items-center" numColSpan={3}>
        <Select
          className="row-span-full"
          value={selectedValue}
          onValueChange={onValueChange}
        >
          {options}
        </Select>
      </Col>
      <Col className="items-center col-start-3 pt-2 pl-2" numColSpan={3}>
        {instruction}
      </Col>
    </Grid>
  );
}

export default SingleSelector;
