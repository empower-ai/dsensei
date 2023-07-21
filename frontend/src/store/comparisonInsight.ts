import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { InsightMetric } from "../common/types";

export type RowStatus = {
  key: string[];
  keyComponents: string[];
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

function helper(
  row: RowStatus,
  checkingKey: string,
  checkingKeyComponents: string[]
) {
  if (
    !row.keyComponents.every((component) =>
      checkingKeyComponents.includes(component)
    )
  ) {
    return false;
  }

  const newRow = {
    key: [...row.key, checkingKey],
    keyComponents: checkingKeyComponents,
    isExpanded: false,
    children: {},
  };

  let hasMatching = false;
  Object.values(row.children).forEach((child) => {
    if (helper(child, checkingKey, checkingKeyComponents)) {
      hasMatching = true;
    }
  });

  if (!hasMatching) {
    row.children[checkingKey] = newRow;
  }
  return true;
}

function buildRowStatusMap(metric: InsightMetric): {
  [key: string]: RowStatus;
} {
  // const dimensionSliceInfoMap = metric.dimensionSliceInfo;
  const result: { [key: string]: RowStatus } = {};
  metric.topDriverSliceKeys.forEach((key) => {
    const keyComponents = key.split("|");
    let hasMatching = false;

    Object.values(result).forEach((child) => {
      if (helper(child, key, keyComponents)) {
        hasMatching = true;
      }
    });

    if (!hasMatching) {
      result[key] = {
        key: [key],
        keyComponents: keyComponents,
        isExpanded: false,
        children: {},
      };
    }
  });

  console.log(metric.topDriverSliceKeys);

  return result;
}

// function buildRowStatusForDimensionSlice(
//   key: string,
//   dimensionSliceInfoMap: { [key: string]: DimensionSliceInfo },
//   parentKeys: string[]
// ): [string, RowStatus] {
//   const dimensionSliceInfo = dimensionSliceInfoMap[key];

//   return [
//     key,
//     {
//       key: [...parentKeys, key],
//       isExpanded: false,
//       children: Object.fromEntries(
//         dimensionSliceInfo?.topDrivingDimensionSliceKeys.map((subKey) =>
//           buildRowStatusForDimensionSlice(subKey, dimensionSliceInfoMap, [
//             ...parentKeys,
//             key,
//           ])
//         ) ?? []
//       ),
//     },
//   ];
// }

const initialState: ComparisonInsightState = {
  analyzingMetrics: {} as InsightMetric,
  relatedMetrics: [],
  tableRowStatus: {},
  isLoading: true,
};

export const comparisonMetricsSlice = createSlice({
  name: "comparison-insight",
  initialState,
  reducers: {
    setLoadingStatus: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateMetrics: (
      state,
      action: PayloadAction<{
        revenue: object;
        unique_user: object;
        unique_order: object;
      }>
    ) => {
      const revenueMetric = action.payload["revenue"] as InsightMetric;
      const buyersMetric = action.payload["unique_user"] as InsightMetric;
      const ordersMetric = action.payload["unique_order"] as InsightMetric;

      if (!revenueMetric || !buyersMetric || !ordersMetric) {
        console.log("skip, invalid metrics");
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

export const {
  toggleRow,
  selectSliceForDetail,
  updateMetrics,
  setLoadingStatus,
} = comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
