import React, { ReactElement } from "react";
import { Col, Grid, MultiSelect, MultiSelectItem, Text } from "@tremor/react";

type MultiSelectorProps = {
  title: string | null;
  labels: string[];
  values: string[];
  selectedValues: string[];
  onValueChange: (value: string[]) => void;
  instruction?: ReactElement;
};

function MultiSelector({
  title,
  labels,
  values,
  selectedValues,
  onValueChange,
  instruction,
}: MultiSelectorProps) {
  const options = values.map((v, i) => (
    <MultiSelectItem value={v} key={v}>
      {labels[i]}
    </MultiSelectItem>
  ));

  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        <Text className="pr-4 text-black">{title}</Text>
      </Col>
      <Col className="flex items-center" numColSpan={3}>
        <MultiSelect value={selectedValues} onValueChange={onValueChange}>
          {options}
        </MultiSelect>
      </Col>
      <Col className="items-center col-start-3 pt-2 pl-2" numColSpan={3}>
        {instruction}
      </Col>
    </Grid>
  );
}

export default MultiSelector;
