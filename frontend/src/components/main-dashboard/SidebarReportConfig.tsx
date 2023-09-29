import { Button, Flex, Text } from "@tremor/react";
import { useRef, useState } from "react";
import { Filter } from "../../common/types";
import { Schema } from "../../types/data-source";
import { DateRangeRelatedData } from "../../types/report-config";
import {
  FiltersDropDown,
  FiltersDropDownHandler,
} from "../common/FiltersDropdown";
import DatePicker, { DateRangeData } from "../uploader/DatePicker";
import MultiSelector, { MultiSelectorHandles } from "../uploader/MultiSelector";

interface Props {
  allDimensions: string[];
  schema: Schema;
  dimensions: string[];
  filters: Filter[];
  dateColumn: string;
  dateRangeData: DateRangeRelatedData;
  onSubmit: (
    newFilters: Filter[],
    newDimensions: string[],
    newBaseDateRangeData: DateRangeData,
    newComparisonDateRangeData: DateRangeData
  ) => void;
}

export function SidebarReportConfig({
  allDimensions,
  schema,
  dimensions,
  filters,
  dateColumn,
  dateRangeData,
  onSubmit,
}: Props) {
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters);
  const [localDimensions, setLocalDimensions] = useState<string[]>(dimensions);
  const [localBaseDateRangeData, setLocalBaseDateRangeData] =
    useState<DateRangeData>(dateRangeData.baseDateRangeData);
  const [localComparisonDateRangeData, setLocalComparisonDateRangeData] =
    useState<DateRangeData>(dateRangeData.comparisonDateRangeData);

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

    const hasChangeInBaseDateRange =
      dateRangeData.baseDateRangeData.range.from !==
        localBaseDateRangeData.range.from ||
      dateRangeData.baseDateRangeData.range.to !==
        localBaseDateRangeData.range.to;

    const hasChangeInComparisonDateRange =
      dateRangeData.comparisonDateRangeData.range.from !==
        localComparisonDateRangeData.range.from ||
      dateRangeData.comparisonDateRangeData.range.to !==
        localComparisonDateRangeData.range.to;

    return (
      hasChangeInDimensions ||
      hasChangeInFilters ||
      hasChangeInBaseDateRange ||
      hasChangeInComparisonDateRange
    );
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
        <DatePicker
          title={null}
          countByDate={
            dateRangeData.rowCountByDateColumn
              ? dateRangeData.rowCountByDateColumn[dateColumn]
              : {}
          }
          comparisonDateRangeData={localComparisonDateRangeData}
          setComparisonDateRangeData={(dateRangeData) =>
            setLocalComparisonDateRangeData(dateRangeData)
          }
          baseDateRangeData={localBaseDateRangeData}
          setBaseDateRangeData={(dateRangeData) =>
            setLocalBaseDateRangeData(dateRangeData)
          }
          isOnSideBar={true}
        />
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
            onClick={() =>
              onSubmit(
                localFilters,
                localDimensions,
                localBaseDateRangeData,
                localComparisonDateRangeData
              )
            }
          >
            Rerun
          </Button>
          <Button
            variant="secondary"
            disabled={!hasLocalChange()}
            onClick={() => {
              setLocalDimensions(dimensions);
              setLocalFilters(filters);
              setLocalBaseDateRangeData(dateRangeData.baseDateRangeData);
              setLocalComparisonDateRangeData(
                dateRangeData.comparisonDateRangeData
              );

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
