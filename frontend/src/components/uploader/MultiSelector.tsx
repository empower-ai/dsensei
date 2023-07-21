import React from "react";
import {
  Col,
  Grid,
  MultiSelect,
  MultiSelectItem,
  Title,
} from "@tremor/react";

type MultiSelectorProps = {
  title: string | null;
  labels: string[];
  values: string[];
  selectedValues: string[];
  onValueChange: (value: string[]) => void;
};

function MultiSelector({
  title,
  labels,
  values,
  selectedValues,
  onValueChange,
}: MultiSelectorProps) {
  const options = values.map((v, i) => (
    <MultiSelectItem value={v} key={v}>
      {labels[i]}
    </MultiSelectItem>
  ));

  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        <Title className="pr-4">{title}</Title>
      </Col>
      <Col className="flex items-center" numColSpan={3}>
        <MultiSelect value={selectedValues} onValueChange={onValueChange}>
          {options}
        </MultiSelect>
      </Col>
    </Grid>
  );
}

export default MultiSelector;
