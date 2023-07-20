import { ReactNode } from "react";
import { DimensionSliceKey } from "./types";

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

export function serializeDimensionSliceKey(key: DimensionSliceKey): string {
  return [...key]
    .sort(sortDimension)
    .map((k) => `${k.dimension}:${k.value}`)
    .join("|");
}

export function formatDimensionSliceKeyForRendering(
  key: DimensionSliceKey,
  parentKey?: DimensionSliceKey
): ReactNode {
  const copiedKey = [...key];
  const copiedParentKey = [...(parentKey ?? [])];

  return [
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
    .map((k) => `${k.dimension}:${k.value}`)
    .join(" AND ");
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
