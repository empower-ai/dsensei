import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  DimensionSliceInfo,
  DimensionSliceKey,
  InsightMetric,
} from "../common/types";
import { serializeDimensionSliceKey } from "../common/utils";
// import {
//   dummyBuyersMetric,
//   dummyOrdersMetric,
//   dummyRevenueMetric,
// } from "./dummyData";

export type RowStatus = {
  key: string[];
  isExpanded: boolean;
  children: {
    [key: string]: RowStatus;
  };
};

export interface ComparisonInsightState {
  analyzingMetrics: InsightMetric;
  relatedMetrics: InsightMetric[];
  selectedSliceKey?: string;
  tableRowStatus: {
    [key: string]: RowStatus;
  };
  isLoading: boolean;
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
  key: string,
  dimensionSliceInfoMap: {[key: string]: DimensionSliceInfo},
  parentKeys: string[]
): [string, RowStatus] {
  const dimensionSliceInfo = dimensionSliceInfoMap[key];

  return [
    key,
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
// console.log(buildRowStatusMap(dummyRevenueMetric));

const initialState: ComparisonInsightState = {
  analyzingMetrics: {} as InsightMetric,
  relatedMetrics: [],
  tableRowStatus: {} ,
  isLoading: true,
};

export const comparisonMetricsSlice = createSlice({
  name: "comparison-insight",
  initialState,
  reducers: {
    setLoadingStatus: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateMetrics: (state, action: PayloadAction<{ revenue: object, unique_user: object, unique_order: object}>) => {
      const revenueMetric = action.payload["revenue"] as InsightMetric;
      const buyersMetric = action.payload["unique_user"] as InsightMetric;
      const ordersMetric = action.payload["unique_order"] as InsightMetric;

      if (!revenueMetric || !buyersMetric || !ordersMetric) {
        console.log('skip, invalid metrics');
        return;
      }

      state.analyzingMetrics = revenueMetric;
      state.relatedMetrics = [buyersMetric, ordersMetric];
      state.tableRowStatus = buildRowStatusMap(revenueMetric);
      state.isLoading = false;
    },

    toggleRow: (state, action: PayloadAction<string[]>) => {
      let rowStatus: RowStatus | undefined;
      let initialized = false;
      action.payload.forEach((key) => {
        if (!rowStatus) {
          if (!initialized) {
            rowStatus = state.tableRowStatus[key];
          } else {
            rowStatus = undefined;
          }
        } else {
          rowStatus = rowStatus.children[key];
        }
      });

      if (rowStatus) {
        rowStatus.isExpanded = !rowStatus.isExpanded;
      }
    },
    selectSliceForDetail: (state, action: PayloadAction<string>) => {
      state.selectedSliceKey = action.payload;
    },
  },
});

export const { toggleRow, selectSliceForDetail, updateMetrics, setLoadingStatus } =
  comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
