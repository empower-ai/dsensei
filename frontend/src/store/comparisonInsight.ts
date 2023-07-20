import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  DimensionSliceInfo,
  DimensionSliceKey,
  InsightMetric,
} from "../common/types";
import { serializeDimensionSliceKey } from "../common/utils";
import {
  dummyBuyersMetric,
  dummyOrdersMetric,
  dummyRevenueMetric,
} from "./dummyData";

export type RowStatus = {
  key: DimensionSliceKey[];
  isExpanded: boolean;
  children: {
    [key: string]: RowStatus;
  };
};

export interface ComparisonInsightState {
  analyzingMetrics: InsightMetric;
  relatedMetrics: InsightMetric[];
  selectedSliceKey?: DimensionSliceKey;
  tableRowStatus: {
    [key: string]: RowStatus;
  };
}

function buildRowStatusMap(metric: InsightMetric): {
  [key: string]: RowStatus;
} {
  const dimensionSliceInfoMap = metric.dimensionSliceInfo;
  return Object.fromEntries(
    metric.topDriverSliceKeys.map((key) =>
      buildRowStatusForDimensionSlice(key, dimensionSliceInfoMap, [])
    )
  );
}

function buildRowStatusForDimensionSlice(
  key: DimensionSliceKey,
  dimensionSliceInfoMap: Map<string, DimensionSliceInfo>,
  parentKeys: DimensionSliceKey[]
): [string, RowStatus] {
  const serializedKey = serializeDimensionSliceKey(key);

  const dimensionSliceInfo = dimensionSliceInfoMap.get(serializedKey);

  return [
    serializeDimensionSliceKey(key),
    {
      key: [...parentKeys, key],
      isExpanded: false,
      children: Object.fromEntries(
        dimensionSliceInfo?.topDrivingDimensionSliceKeys.map((subKey) =>
          buildRowStatusForDimensionSlice(subKey, dimensionSliceInfoMap, [
            ...parentKeys,
            key,
          ])
        ) ?? []
      ),
    },
  ];
}
console.log(buildRowStatusMap(dummyRevenueMetric));

const initialState: ComparisonInsightState = {
  analyzingMetrics: dummyRevenueMetric,
  relatedMetrics: [dummyBuyersMetric, dummyOrdersMetric],
  tableRowStatus: buildRowStatusMap(dummyRevenueMetric),
  selectedSliceKey: [
    {
      dimension: "country",
      value: "USA",
    },
  ],
};

export const comparisonMetricsSlice = createSlice({
  name: "comparison-insight",
  initialState,
  reducers: {
    toggleRow: (state, action: PayloadAction<DimensionSliceKey[]>) => {
      let rowStatus: RowStatus | undefined;
      let initialized = false;
      action.payload.forEach((key) => {
        if (!rowStatus) {
          if (!initialized) {
            rowStatus = state.tableRowStatus[serializeDimensionSliceKey(key)];
          } else {
            rowStatus = undefined;
          }
        } else {
          rowStatus = rowStatus.children[serializeDimensionSliceKey(key)];
        }
      });

      if (rowStatus) {
        rowStatus.isExpanded = !rowStatus.isExpanded;
      }
    },
    selectSliceForDetail: (state, action: PayloadAction<DimensionSliceKey>) => {
      state.selectedSliceKey = action.payload;
    },
  },
});

export const { toggleRow, selectSliceForDetail } =
  comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
