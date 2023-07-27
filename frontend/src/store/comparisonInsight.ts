import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DimensionSliceKey, InsightMetric } from "../common/types";

export const csvHeader = [
  "columns",
  "column_values",
  "base_period_size",
  "comparison_period_size",
  "previous_value",
  "comparison_value",
  "impact",
];

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
  tableRowCSV: (number | string)[][];
  tableRowStatusByDimension: {
    [key: string]: {
      rowStatus: {
        [key: string]: RowStatus;
      };
      rowCSV: (number | string)[][];
    };
  };
  waterfallRows: {
    key: DimensionSliceKey;
    impact: number;
  }[];
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

function buildWaterfall(metric: InsightMetric): {
  key: DimensionSliceKey;
  impact: number;
}[] {
  const initialKey = metric.topDriverSliceKeys[0];
  const initialSlice = metric.dimensionSliceInfo[initialKey];
  const result = [
    {
      key: initialSlice.key,
      impact: initialSlice.impact,
    },
  ];

  const excludeKeys = [initialSlice.key];

  const excludeValues: {
    [key: string]: (number | string)[];
  } = {};

  initialSlice.key.forEach((keyPart) => {
    if (!excludeValues[keyPart.dimension]) {
      excludeValues[keyPart.dimension] = [];
    }

    excludeValues[keyPart.dimension].push(keyPart.value);
  });

  metric.topDriverSliceKeys.forEach((key) => {
    const sliceInfo = metric.dimensionSliceInfo[key];

    const shouldAdd = excludeKeys.every((excludeKey) => {
      return (
        excludeKey
          .map((k) => k.dimension)
          .every((d) => sliceInfo.key.map((k) => k.dimension).includes(d)) &&
        excludeKey.find((k) =>
          sliceInfo.key.find(
            (kk) => kk.dimension === k.dimension && kk.value !== k.value
          )
        )
      );
    });

    if (shouldAdd) {
      sliceInfo.key.forEach((keyPart) => {
        if (!excludeValues[keyPart.dimension]) {
          excludeValues[keyPart.dimension] = [];
        }
        excludeValues[keyPart.dimension].push(keyPart.value);
        excludeKeys.push(sliceInfo.key);
      });

      result.push({
        key: sliceInfo.key,
        impact: sliceInfo.impact,
      });
    }
  });

  return result;
}

function buildRowStatusMap(
  metric: InsightMetric,
  groupRows: boolean
): [
  {
    [key: string]: RowStatus;
  },
  (number | string)[][]
] {
  const result: { [key: string]: RowStatus } = {};
  const resultInCSV: (number | string)[][] = [csvHeader];

  if (!groupRows) {
    metric.topDriverSliceKeys.forEach((key) => {
      result[key] = {
        key: [key],
        keyComponents: key.split("|"),
        isExpanded: false,
        children: {},
      };
    });
  } else {
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
  }

  Object.keys(result).forEach((sliceKey) => {
    const sliceInfo = metric.dimensionSliceInfo[sliceKey];
    resultInCSV.push([
      sliceInfo.key.map((keyPart) => keyPart.dimension).join("|"),
      sliceInfo.key.map((keyPart) => keyPart.value).join("|"),
      sliceInfo.baselineValue.sliceSize,
      sliceInfo.comparisonValue.sliceSize,
      sliceInfo.baselineValue.sliceValue,
      sliceInfo.comparisonValue.sliceValue,
      sliceInfo.impact,
    ]);
  });
  return [result, resultInCSV];
}

function buildRowStatusByDimensionMap(metric: InsightMetric): {
  [key: string]: {
    rowStatus: {
      [key: string]: RowStatus;
    };
    rowCSV: (number | string)[][];
  };
} {
  const result: {
    [key: string]: {
      rowStatus: {
        [key: string]: RowStatus;
      };
      rowCSV: (number | string)[][];
    };
  } = {};

  return result;

  metric.topDriverSliceKeys.forEach((key) => {
    const keyComponents = key.split("|");
    if (keyComponents.length > 1) {
      return;
    }

    const [dimension] = keyComponents[0].split(":");

    if (!result[dimension]) {
      result[dimension] = {
        rowCSV: [csvHeader],
        rowStatus: {},
      };
    }

    result[dimension].rowStatus[key] = {
      key: [key],
      keyComponents,
      isExpanded: false,
      children: {},
    };

    const sliceInfo = metric.dimensionSliceInfo[key];
    result[dimension].rowCSV.push([
      sliceInfo.key.map((keyPart) => keyPart.dimension).join("|"),
      sliceInfo.key.map((keyPart) => keyPart.value).join("|"),
      sliceInfo.baselineValue.sliceSize,
      sliceInfo.comparisonValue.sliceSize,
      sliceInfo.baselineValue.sliceValue,
      sliceInfo.comparisonValue.sliceValue,
      sliceInfo.impact,
    ]);
  });

  metric.topDriverSliceKeys.forEach((key) => {
    console.log(key);
    const keyComponents = key.split("|");
    if (keyComponents.length === 1) {
      return;
    }

    keyComponents.forEach((keyComponent) => {
      const [dimension] = keyComponent.split(":");
      console.log(result);
      console.log(dimension);

      Object.values(result[dimension].rowStatus).forEach((child) => {
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
  tableRowCSV: [],
  tableRowStatusByDimension: {},
  waterfallRows: [],
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
//
      // state.analyzingMetrics.topDriverSliceKeys = state.analyzingMetrics.topDriverSliceKeys.filter(
      //   (key) => {
      //     return state.analyzingMetrics.dimensionSliceInfo[key].changeDev > 0.5;
      // });
//
      state.relatedMetrics = keys
        .map((key, index) => {
          if (index === 0) {
            return undefined;
          }
          return action.payload[key] as InsightMetric;
        })
        .filter((metric) => metric !== undefined) as InsightMetric[];

      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        true
      );
      state.tableRowStatusByDimension = buildRowStatusByDimensionMap(
        state.analyzingMetrics
      );
      state.waterfallRows = buildWaterfall(state.analyzingMetrics);
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
              rowStatus =
                state.tableRowStatusByDimension[dimension].rowStatus[key];
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
      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
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
