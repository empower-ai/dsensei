import React, { ReactElement } from "react";
import { Grid, Col, Select, SelectItem, Title } from "@tremor/react";

type SingleSelectorProps = {
  title: ReactElement | null;
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
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        {title}
      </Col>
      <Col className="flex items-center" numColSpan={3}>
        <Select value={selectedValue} onValueChange={onValueChange}>
          {options}
        </Select>
      </Col>
    </Grid>
  );
}

export default SingleSelector;
