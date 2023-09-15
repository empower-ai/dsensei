import { Flex, JustifyContent, Text } from "@tremor/react";
import * as graphlib from "graphlib";
import moment from "moment";
import { ReactNode } from "react";
import { DimensionSliceKey, InsightMetric } from "./types";

export function sortDimension(
  dimension1: {
    dimension: string;
    value: string;
  },
  dimension2: {
    dimension: string;
    value: string;
  }
): number {
  return dimension1.dimension.toLowerCase() > dimension2.dimension.toLowerCase()
    ? 1
    : -1;
}

export function serializeDimensionSliceKey(
  key: DimensionSliceKey,
  valueSplitter: string = ":",
  dimensionSplitter: string = "|"
): string {
  return [...key]
    .sort(sortDimension)
    .map((k) => `${k.dimension}${valueSplitter}${k.value}`)
    .join(dimensionSplitter);
}

export function deSerializeDimensionSliceKey(key: string): DimensionSliceKey {
  return key.split("|").map((keyPart) => {
    const [dimension, ...reset] = keyPart.split(":");
    return {
      dimension,
      value: reset.join(""),
    };
  });
}

export function formatDimensionSliceKeyForRendering(
  key: DimensionSliceKey,
  parentKey?: DimensionSliceKey,
  addBorder: boolean = true,
  justifyContent: JustifyContent = "start",
  additionalClass: string = ""
): ReactNode {
  const copiedKey = [...key];
  const copiedParentKey = [...(parentKey ?? [])];

  return (
    <Flex justifyContent={justifyContent} className={additionalClass}>
      {[
        ...copiedParentKey.sort(sortDimension),
        ...copiedKey
          .filter(
            (k) =>
              (parentKey ?? []).filter(
                (pk) => pk.dimension === k.dimension && pk.value === k.value
              ).length === 0
          )
          .sort(sortDimension),
      ]
        .map((k) => (
          <span
            className={`text-black ${
              addBorder ? `border-2 bg-gray-100 p-1` : ""
            }`}
          >
            {k.dimension} = {k.value}
          </span>
        ))
        .flatMap((element, index, array) =>
          array.length - 1 !== index
            ? [element, <Text className="px-1">AND</Text>]
            : [element]
        )}
    </Flex>
  );
}

export function getRegexMatchPatternForDimensionSliceKey(
  key: DimensionSliceKey
): RegExp {
  const baseRegexStr = [...key]
    .sort((k1, k2) =>
      k1.dimension.toLowerCase() > k2.dimension.toLowerCase() ? 1 : -1
    )
    .map((k) => `${k.dimension}:[^\\|]+`)
    .join("\\|");

  return new RegExp(`^${baseRegexStr}$`);
}

export function formatNumber(num: number, digits: number = 2) {
  if (Number.isInteger(num)) {
    return num.toLocaleString(undefined);
  }

  return num.toLocaleString(undefined, {
    style: "decimal",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function renderDebugInfo(label: string, value: number | string) {
  const renderedValue =
    typeof value === "number" ? formatNumber(value, 4) : value;
  return (
    <Flex className="gap-1" justifyContent="start">
      <Text color="red">DEBUG</Text>{" "}
      <Text>
        {label}: {renderedValue}
      </Text>
    </Flex>
  );
}

export function formatDateString(dateString: string): string {
  return moment(createNewDateWithBrowserTimeZone(dateString)).format(
    "MMM D, YYYY"
  );
}

export function formatMetricName(metric: InsightMetric): string {
  return metric.name;
}

export function formatMetricValue(num: number, metricType: string): string {
  if (metricType === "RATIO") {
    return `${formatNumber(num * 100)}%`;
  }
  return formatNumber(num);
}

function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function createNewDateWithBrowserTimeZone(targetDate: string): Date {
  const browserTimeZone = getBrowserTimeZone();
  const targetTime = new Date(targetDate).getTime(); // Convert target date to milliseconds since Jan 1, 1970 (UTC)

  // Calculate the local time for the target date using the browser's timezone offset
  const localTime = new Date(
    targetTime + new Date().getTimezoneOffset() * 60 * 1000
  );

  // Calculate the time in the browser's timezone by adjusting the local time
  const browserTime = new Date(
    localTime.toLocaleString("en-US", { timeZone: browserTimeZone })
  );

  return browserTime;
}

export class Graph {
  private graph: graphlib.Graph;

  constructor() {
    this.graph = new graphlib.Graph({ directed: false });
  }

  addVertex(vertex: string) {
    this.graph.setNode(vertex);
  }

  addEdge(vertex1: string, vertex2: string) {
    this.graph.setEdge(vertex1, vertex2);
  }

  connectedComponents(): string[][] {
    const components: string[][] = graphlib.alg.components(this.graph);

    return components;
  }
}

export function hasIntersection<T>(arr1: T[], arr2: T[]): boolean {
  const set1 = new Set(arr1);

  for (const item of arr2) {
    if (set1.has(item)) {
      return true;
    }
  }

  return false;
}
