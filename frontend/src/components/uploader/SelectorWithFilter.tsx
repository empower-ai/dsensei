import {
  Col,
  Flex,
  Grid,
  Select,
  SelectItem,
  Text,
  TextInput,
} from "@tremor/react";

import { ReactElement } from "react";

type Props = {
  title: ReactElement | null;
  labels: string[];
  values: string[];
  icons?: React.ElementType[];
  selectedValue: string;
  onColumnChange: (value: string) => void;
  onValueChange: (value: string) => void;
  instruction?: ReactElement;
  disabled?: boolean;
};

function SelectorWithFilter({
  title,
  labels,
  values,
  icons,
  selectedValue,
  onColumnChange,
  onValueChange,
  instruction,
  disabled,
}: Props) {
  const options = values.map((v, i) => (
    <SelectItem
      value={v}
      key={v}
      icon={icons ? icons[i] : undefined}
      className="cursor-pointer"
    >
      {labels[i]}
    </SelectItem>
  ));
  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        {title}
      </Col>
      <Col className="items-center" numColSpan={1}>
        <Select
          value={selectedValue}
          onValueChange={onColumnChange}
          disabled={disabled}
        >
          {options}
        </Select>
      </Col>

      <Flex className="col-span-2 pl-3">
        <Text className="pr-4 text-black text-center">Equals</Text>

        <TextInput
          className="w-full"
          disabled={disabled}
          placeholder="value"
          onChange={(e) => onValueChange(e.target.value)}
        />
      </Flex>

      <Col className="items-center col-start-3 pt-2 pl-2" numColSpan={3}>
        {instruction}
      </Col>
    </Grid>
  );
}

export default SelectorWithFilter;
