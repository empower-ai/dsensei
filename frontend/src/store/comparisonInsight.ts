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
  tableRowStatusByDimension: {
    [key: string]: {
      [key: string]: RowStatus;
    };
  };
  isLoading: boolean;
  groupRows: boolean;
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

function buildRowStatusMap(
  metric: InsightMetric,
  groupRows: boolean
): {
  [key: string]: RowStatus;
} {
  const result: { [key: string]: RowStatus } = {};

  if (!groupRows) {
    metric.topDriverSliceKeys.forEach((key) => {
      result[key] = {
        key: [key],
        keyComponents: key.split("|"),
        isExpanded: false,
        children: {},
      };
    });
    return result;
  }

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
  return result;
}

function buildRowStatusByDimensionMap(metric: InsightMetric): {
  [key: string]: {
    [key: string]: RowStatus;
  };
} {
  const result: { [key: string]: { [key: string]: RowStatus } } = {};

  metric.topDriverSliceKeys.forEach((key) => {
    const keyComponents = key.split("|");
    if (keyComponents.length > 1) {
      return;
    }

    const [dimension] = keyComponents[0].split(":");

    if (!result[dimension]) {
      result[dimension] = {};
    }

    result[dimension][key] = {
      key: [key],
      keyComponents,
      isExpanded: false,
      children: {},
    };
  });

  metric.topDriverSliceKeys.forEach((key) => {
    const keyComponents = key.split("|");
    if (keyComponents.length === 1) {
      return;
    }

    keyComponents.forEach((keyComponent) => {
      const [dimension] = keyComponent.split(":");

      Object.values(result[dimension]).forEach((child) => {
        helper(child, key, keyComponents);
      });
    });
  });

  return result;
}

const initialState: ComparisonInsightState = {
  analyzingMetrics: {} as InsightMetric,
  relatedMetrics: [],
  tableRowStatus: {},
  tableRowStatusByDimension: {},
  isLoading: true,
  groupRows: true,
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
      action: PayloadAction<{ [key: string]: object }>
    ) => {
      const keys = Object.keys(action.payload);
      state.analyzingMetrics = action.payload[keys[0]] as InsightMetric;
      state.relatedMetrics = keys
        .map((key, index) => {
          if (index === 0) {
            return undefined;
          }
          return action.payload[key] as InsightMetric;
        })
        .filter((metric) => metric !== undefined) as InsightMetric[];

      state.tableRowStatus = buildRowStatusMap(state.analyzingMetrics, true);
      state.tableRowStatusByDimension = buildRowStatusByDimensionMap(
        state.analyzingMetrics
      );
      state.isLoading = false;
    },

    toggleRow: (
      state,
      action: PayloadAction<{
        keyPath: string[];
        dimension?: string;
      }>
    ) => {
      let rowStatus: RowStatus | undefined;
      let initialized = false;
      const { keyPath, dimension } = action.payload;
      keyPath.forEach((key) => {
        if (!rowStatus) {
          if (!initialized) {
            if (dimension) {
              rowStatus = state.tableRowStatusByDimension[dimension][key];
            } else {
              rowStatus = state.tableRowStatus[key];
            }
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
    toggleGroupRows: (state, action: PayloadAction<void>) => {
      state.groupRows = !state.groupRows;
      state.tableRowStatus = buildRowStatusMap(
        state.analyzingMetrics,
        state.groupRows
      );
    },
  },
});

export const {
  toggleRow,
  selectSliceForDetail,
  updateMetrics,
  setLoadingStatus,
  toggleGroupRows,
} = comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
