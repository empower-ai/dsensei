import { Button, Flex, Text } from "@tremor/react";
import { useRef, useState } from "react";
import { Filter } from "../../common/types";
import { Schema } from "../../types/data-source";
import {
  FiltersDropDown,
  FiltersDropDownHandler,
} from "../common/FiltersDropdown";
import MultiSelector, { MultiSelectorHandles } from "../uploader/MultiSelector";

interface Props {
  allDimensions: string[];
  schema: Schema;
  dimensions: string[];
  filters: Filter[];
  onSubmit: (newFilters: Filter[], newDimensions: string[]) => void;
}

export function SidebarReportConfig({
  allDimensions,
  schema,
  dimensions,
  filters,
  onSubmit,
}: Props) {
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters);
  const [localDimensions, setLocalDimensions] = useState<string[]>(dimensions);

  const dimensionSelectorRef = useRef<MultiSelectorHandles | null>(null);
  const filtersDropDownRef = useRef<FiltersDropDownHandler | null>(null);

  function hasLocalChange() {
    const hasChangeInDimensions =
      localDimensions.length !== dimensions.length ||
      !localDimensions.every((localDimension) =>
        dimensions.includes(localDimension)
      );

    const hasChangeInFilters =
      localFilters.length !== filters.length ||
      !localFilters.every((localFilter) =>
        filters.find(
          (filter) =>
            filter.column === localFilter.column &&
            filter.operator === localFilter.operator &&
            filter.values?.length === localFilter.values?.length &&
            filter.values?.every((value) => localFilter.values?.includes(value))
        )
      );

    return hasChangeInDimensions || hasChangeInFilters;
  }
  return (
    <>
      <Flex
        flexDirection="col"
        justifyContent="center"
        alignItems="start"
        className="gap-y-2 p-2"
      >
        <p>Report Config</p>
        <Text>Dimensions</Text>
        <MultiSelector
          includeSelectAll={true}
          labels={allDimensions}
          values={allDimensions}
          selectedValues={localDimensions}
          onValueChange={(selectedDimensions) =>
            setLocalDimensions(selectedDimensions)
          }
          ref={dimensionSelectorRef}
        />
        <Text>Filters</Text>
        <FiltersDropDown
          filters={localFilters}
          dimensions={allDimensions}
          schema={schema}
          onFiltersChanged={(selectedFilters) =>
            setLocalFilters(selectedFilters)
          }
          ref={filtersDropDownRef}
        />
        <Flex justifyContent="end" className="gap-1">
          <Button
            disabled={!hasLocalChange() || localDimensions.length === 0}
            onClick={() => onSubmit(localFilters, localDimensions)}
          >
            Rerun
          </Button>
          <Button
            variant="secondary"
            disabled={!hasLocalChange()}
            onClick={() => {
              setLocalDimensions(dimensions);
              setLocalFilters(filters);

              dimensionSelectorRef.current?.reset(dimensions);
              filtersDropDownRef.current?.reset(filters);
            }}
          >
            Reset
          </Button>
        </Flex>
      </Flex>
    </>
  );
}
