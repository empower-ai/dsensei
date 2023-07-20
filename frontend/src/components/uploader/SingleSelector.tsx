import React from "react";
import { Grid, Col, Select, SelectItem, Title } from "@tremor/react";

type SingleSelectorProps = {
  title: string | null;
  labels: string[];
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
};

function SingleSelector({
  title,
  labels,
  values,
  selectedValue,
  onValueChange,
}: SingleSelectorProps) {
  const options = values.map((v, i) => (
    <SelectItem value={v} key={v}>
      {labels[i]}
    </SelectItem>
  ));
  return (
    <Grid numItems={2}>
      <Col className="flex items-center justify-end">
        <Title className="pr-4">{title}</Title>
      </Col>
      <Col className="flex items-center">
        <Select value={selectedValue} onValueChange={onValueChange}>
          {options}
        </Select>
      </Col>
    </Grid>
  );
}

export default SingleSelector;
