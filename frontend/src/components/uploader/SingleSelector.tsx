import { Col, Grid, Select, SelectItem } from "@tremor/react";
import { ReactElement } from "react";

type SingleSelectorProps = {
  title?: ReactElement;
  labels: string[];
  values: string[];
  icons?: React.ElementType[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  onFilterChange?: (value: boolean) => void;
  instruction?: ReactElement;
  disabled?: boolean;
  filterCheckbox?: boolean;
  placeholder?: string;
  className?: string;
};

function SingleSelector({
  title,
  labels,
  values,
  icons,
  selectedValue,
  onValueChange,
  onFilterChange,
  instruction,
  disabled,
  filterCheckbox: hasFilter,
  placeholder,
  className,
}: SingleSelectorProps) {
  const options = values.map((v, i) => (
    <SelectItem
      value={v}
      key={v}
      icon={icons ? icons[i] : undefined}
      className={`cursor-pointer ${className}`}
    >
      {labels[i]}
    </SelectItem>
  ));

  const selectMenu = (
    <Select
      value={selectedValue}
      onValueChange={onValueChange}
      disabled={disabled}
      placeholder={placeholder ?? "Select..."}
    >
      {options}
    </Select>
  );

  if (!title) {
    return (
      <>
        {selectMenu}
        {instruction}
      </>
    );
  }

  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        {title}
      </Col>
      <Col className="items-center flex" numColSpan={3}>
        {selectMenu}
        {hasFilter && (
          <Col className="flex" numColSpan={1}>
            <label className="ml-2">Has filter</label>
            <input
              type="checkbox"
              className="ml-2"
              onChange={(e) => {
                onFilterChange && onFilterChange(e.target.checked);
              }}
            />
          </Col>
        )}
      </Col>
      <Col className="items-center col-start-3 pt-2 pl-2" numColSpan={3}>
        {instruction}
      </Col>
    </Grid>
  );
}

export default SingleSelector;
