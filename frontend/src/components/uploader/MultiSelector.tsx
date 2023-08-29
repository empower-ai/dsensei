import { Col, Grid, MultiSelect, MultiSelectItem, Text } from "@tremor/react";
import { ReactElement, useState } from "react";

type MultiSelectorProps = {
  title: string | ReactElement;
  labels: string[];
  values: string[];
  selectedValues: string[];
  onValueChange: (value: string[]) => void;
  instruction?: ReactElement;
  includeSelectAll?: boolean;
};

const keySelectAll = "_select_all";

function MultiSelector({
  title,
  labels,
  values,
  selectedValues,
  onValueChange,
  instruction,
  includeSelectAll,
}: MultiSelectorProps) {
  const [wrappedSelectedValues, setWrappedSelectedValues] =
    useState<string[]>(selectedValues);
  let options: ReactElement[] = [];
  if (includeSelectAll) {
    options = [
      <MultiSelectItem
        value={keySelectAll}
        key={keySelectAll}
        className="cursor-pointer"
      >
        Select All
      </MultiSelectItem>,
    ];
  }
  options = options.concat(
    values.map((v, i) => (
      <MultiSelectItem value={v} key={v} className="cursor-pointer">
        {labels[i]}
      </MultiSelectItem>
    ))
  );

  function onValueChangeWrapper(newValue: string[]) {
    const existingValue = wrappedSelectedValues;

    const valueAdded = newValue.find((v) => !existingValue.includes(v));
    const valueRemoved = existingValue.find((v) => !newValue.includes(v));

    if (valueAdded === keySelectAll) {
      setWrappedSelectedValues(values);
      onValueChange(values);
    } else if (valueRemoved) {
      setWrappedSelectedValues(newValue.filter((v) => v !== keySelectAll));
      onValueChange(newValue.filter((v) => v !== keySelectAll));
    } else {
      setWrappedSelectedValues(newValue);
      onValueChange(newValue);
    }
  }

  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        {typeof title === "string" ? (
          <Text className="pr-4 text-black">{title}</Text>
        ) : (
          title
        )}
      </Col>
      <Col className="flex items-center" numColSpan={3}>
        <MultiSelect
          value={wrappedSelectedValues}
          onValueChange={onValueChangeWrapper}
        >
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
