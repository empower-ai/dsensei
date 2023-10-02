import { PlusCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import {
  Divider,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Text,
} from "@tremor/react";
import { ForwardedRef, forwardRef, useImperativeHandle, useState } from "react";
import { Filter, FilterOperator } from "../../common/types";
import { Schema } from "../../types/data-source";
import MultiSelector from "../uploader/MultiSelector";
import SingleSelector from "../uploader/SingleSelector";

interface Props {
  filters: Filter[];
  dimensions: string[];
  schema: Schema;
  onFiltersChanged: (filters: Filter[]) => void;
}

export interface FiltersDropDownHandler {
  reset: (filters: Filter[]) => void;
}

export const FiltersDropDown = forwardRef(function FiltersDropDown(
  { filters, dimensions, schema, onFiltersChanged }: Props,
  ref: ForwardedRef<FiltersDropDownHandler>
) {
  const [localFilters, setLocalFilters] = useState<Filter[]>(
    filters.length === 0 ? [{}] : filters
  );

  useImperativeHandle(ref, () => ({
    reset(filters?: Filter[]) {
      const newFilters =
        filters === undefined || filters.length === 0 ? [{}] : filters;
      setLocalFilters(newFilters);
    },
  }));

  function sanitizeFiltersAndCallOnFiltersChanged(filters: Filter[]) {
    onFiltersChanged(filters.filter(isFilterValid));
  }

  function getColumns(filter: Filter) {
    const baseFilters = dimensions.filter(
      (dimension) => !localFilters.find((filter) => filter.column === dimension)
    );

    if (filter.column) {
      return [...baseFilters, filter.column].sort(sorter);
    }
    return baseFilters.sort(sorter);
  }

  function focusOnDropDownContent() {
    // hack to prevent clicking on the select item from closing the whole dropdown
    document.getElementById("filters-dropdown")?.focus();
  }

  function updateFilter(index: number, filter: Filter) {
    focusOnDropDownContent();
    const updatedLocalFilters = [
      ...localFilters.slice(0, index),
      filter,
      ...localFilters.slice(index + 1),
    ];

    setLocalFilters(updatedLocalFilters);
    sanitizeFiltersAndCallOnFiltersChanged(updatedLocalFilters);
  }

  function removeFilter(index: number) {
    focusOnDropDownContent();
    const filtersAfterRemoval = localFilters.filter((_, idx) => idx !== index);

    let updatedLocalFilters = [{}];
    if (filtersAfterRemoval.length > 0) {
      updatedLocalFilters = filtersAfterRemoval;
    }

    setLocalFilters(updatedLocalFilters);
    sanitizeFiltersAndCallOnFiltersChanged(updatedLocalFilters);
  }

  function getValues(filter: Filter) {
    return (
      schema.fields.find((field) => field.name === filter.column)?.values ?? []
    ).sort(sorter);
  }

  function sorter(s1: string, s2: string): number {
    return s1.toLowerCase().localeCompare(s2.toLowerCase());
  }

  function isFilterValid(filter: Filter): boolean {
    if (filter.operator === "eq" || filter.operator === "neq") {
      return (
        filter.column != null &&
        filter.operator != null &&
        filter.values != null &&
        filter.values.length > 0
      );
    } else if (filter.operator === "empty" || filter.operator === "non_empty") {
      return filter.column != null;
    }
    return false;
  }

  return (
    <div className="dropdown w-full">
      <div
        tabIndex={0}
        className="flex cursor-pointer w-full outline-none text-left whitespace-nowrap truncate rounded-tremor-default focus:ring-2 transition duration-100 shadow-tremor-input focus:border-tremor-brand-subtle focus:ring-tremor-brand-muted dark:shadow-dark-tremor-input dark:focus:border-dark-tremor-brand-subtle dark:focus:ring-dark-tremor-brand-muted pl-4 pr-8 py-2 border bg-tremor-background dark:bg-dark-tremor-background hover:bg-tremor-background-muted dark:hover:bg-dark-tremor-background-muted text-tremor-content-emphasis dark:text-dark-tremor-content-emphasis border-tremor-border dark:border-dark-tremor-border"
      >
        <Flex>{localFilters.filter(isFilterValid).length} selected</Flex>
        <span className="absolute inset-y-0 right-0 flex items-center mr-2.5">
          <svg
            className="tremor-MultiSelect-arrowDownIcon flex-none text-tremor-content-subtle dark:text-dark-tremor-content-subtle h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </span>
      </div>
      <div
        tabIndex={0}
        id="filters-dropdown"
        className="p-2 shadow dropdown-content z-[100] min-h-[400px] max-h-[600px] overflow-auto bg-base-100 w-max-content rounded-tremor-default bg-tremor-background border-tremor-border divide-tremor-border shadow-tremor-dropdown"
      >
        <Table className="overflow-visible">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell className="text-black text-center">Column</TableCell>
              <TableCell className="text-black text-center">Operator</TableCell>
              <TableCell className="text-black text-center">Values</TableCell>
            </TableRow>
          </TableHead>
          <TableBody className="bg-white">
            {localFilters.map((filter, index) => (
              <TableRow key={`${filter}-${index}`}>
                <TableCell className="align-top">
                  <button className="pt-2" onClick={() => removeFilter(index)}>
                    <XCircleIcon height="20px" />
                  </button>
                </TableCell>
                <TableCell className="align-top">
                  <SingleSelector
                    labels={getColumns(filter)}
                    values={getColumns(filter)}
                    selectedValue={filter.column ?? ""}
                    onValueChange={(value) =>
                      updateFilter(index, {
                        ...filter,
                        column: value,
                        values: [],
                      })
                    }
                  />
                </TableCell>
                <TableCell className="align-top">
                  <SingleSelector
                    labels={["equal", "not equal", "is empty", "is not empty"]}
                    values={["eq", "neq", "empty", "non_empty"]}
                    selectedValue={filter.operator ?? ""}
                    onValueChange={(value) =>
                      updateFilter(index, {
                        ...filter,
                        operator: value as FilterOperator,
                        values:
                          value === "eq" || value === "neq"
                            ? filter.values
                            : undefined,
                      })
                    }
                    disabled={!filter.column}
                  />
                </TableCell>
                <TableCell className="align-top">
                  {filter.operator === "eq" || filter.operator === "neq" ? (
                    <MultiSelector
                      includeSelectAll={true}
                      labels={getValues(filter)}
                      values={getValues(filter)}
                      selectedValues={filter.values ?? []}
                      onValueChange={(values) => {
                        updateFilter(index, {
                          ...filter,
                          values,
                        });
                      }}
                      disabled={!filter.column}
                    />
                  ) : (
                    <Flex
                      justifyContent="center"
                      className="w-full min-w-[10rem]"
                    >
                      <Text>N/A</Text>
                    </Flex>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Divider className="mt-0 mb-2" />
        <Flex justifyContent="center">
          <button onClick={() => setLocalFilters([...localFilters, {}])}>
            <Flex justifyContent="center" className="gap-2">
              <PlusCircleIcon height={24} />
              <Text className="text-sky-800">Add</Text>
            </Flex>
          </button>
        </Flex>
      </div>
    </div>
  );
});
