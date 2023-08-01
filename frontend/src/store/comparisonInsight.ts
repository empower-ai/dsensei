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
  selectedDimensions: string[];
  mode: "impact" | "outlier";
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

function buildWaterfall(
  metric: InsightMetric,
  selectedDimensions: string[]
): {
  key: DimensionSliceKey;
  impact: number;
}[] {
  const topDriverSliceKeys = getFilteredTopDriverSliceKeys(
    metric,
    selectedDimensions
  );
  const dimensionSliceInfo = getFilteredDimensionSliceInfo(
    metric,
    selectedDimensions
  );

  const initialKey = topDriverSliceKeys[0];
  const initialSlice = dimensionSliceInfo[initialKey];
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

  topDriverSliceKeys.forEach((key) => {
    const sliceInfo = dimensionSliceInfo[key];

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

function getStandardDeviation(changes: number[]): number {
  const n = changes.length;
  const mean = changes.reduce((a, b) => a + b) / n;
  return Math.sqrt(
    changes.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n
  );
}

function buildRowStatusMap(
  metric: InsightMetric,
  groupRows: boolean,
  mode: "impact" | "outlier" = "impact",
  selectedDimensions: string[]
): [
  {
    [key: string]: RowStatus;
  },
  (number | string)[][]
] {
  const result: { [key: string]: RowStatus } = {};
  const resultInCSV: (number | string)[][] = [csvHeader];
  const filteredTopDriverSliceKeys = getFilteredTopDriverSliceKeys(
    metric,
    selectedDimensions
  );
  const changeStd = getStandardDeviation(
    filteredTopDriverSliceKeys.map(
      (key) => metric.dimensionSliceInfo[key].changePercentage
    )
  );

  const topDriverSliceKeys = filteredTopDriverSliceKeys.filter((key) => {
    const sliceInfo = metric.dimensionSliceInfo[key];

    const changeDev = Math.abs(
      (sliceInfo.changePercentage - metric.expectedChangePercentage) / changeStd
    );
    return mode === "impact" || changeDev > 0.3;
  });

  if (!groupRows) {
    topDriverSliceKeys.forEach((key) => {
      result[key] = {
        key: [key],
        keyComponents: key.split("|"),
        isExpanded: false,
        children: {},
      };
    });
  } else {
    topDriverSliceKeys.forEach((key) => {
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

function buildRowStatusByDimensionMap(
  metric: InsightMetric,
  selectedDimensions: string[]
): {
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

  const dimensionSliceInfoSorted = Object.values(
    getFilteredDimensionSliceInfo(metric, selectedDimensions)
  ).sort((i1, i2) => Math.abs(i2.impact) - Math.abs(i1.impact));

  dimensionSliceInfoSorted.forEach((sliceInfo) => {
    if (sliceInfo.key.length > 1) {
      return;
    }

    const dimension = sliceInfo.key[0].dimension;
    if (!result[dimension]) {
      result[dimension] = {
        rowCSV: [csvHeader],
        rowStatus: {},
      };
    }

    result[dimension].rowStatus[sliceInfo.serializedKey] = {
      key: [sliceInfo.serializedKey],
      keyComponents: sliceInfo.key.map(
        (keyPart) => `${keyPart.dimension}:${keyPart.value}`
      ),
      isExpanded: false,
      children: {},
    };

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

  dimensionSliceInfoSorted.forEach((sliceInfo) => {
    if (sliceInfo.key.length === 1) {
      return;
    }

    const keyComponents = sliceInfo.key.map(
      (keyPart) => `${keyPart.dimension}:${keyPart.value}`
    );
    keyComponents.forEach((keyComponent) => {
      const [dimension] = keyComponent.split(":");

      Object.values(result[dimension].rowStatus).forEach((child) => {
        helper(child, sliceInfo.serializedKey, keyComponents);
      });
    });
  });

  return result;
}

function getFilteredTopDriverSliceKeys(
  metric: InsightMetric,
  selectedDimensions: string[]
) {
  return metric.topDriverSliceKeys.filter((key) => {
    const sliceInfo = metric.dimensionSliceInfo[key];

    return sliceInfo.key.every((k) => selectedDimensions.includes(k.dimension));
  });
}

function getFilteredDimensionSliceInfo(
  metric: InsightMetric,
  selectedDimensions: string[]
) {
  const filteredEntries = Object.entries(metric.dimensionSliceInfo).filter(
    (entry) => {
      const sliceInfo = entry[1];

      return sliceInfo.key.every((k) =>
        selectedDimensions.includes(k.dimension)
      );
    }
  );

  return Object.fromEntries(filteredEntries);
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
  selectedDimensions: [],
  mode: "impact",
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
      state.selectedDimensions = Object.values(
        state.analyzingMetrics.dimensions
      ).map((d) => d.name);
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
        true,
        state.mode,
        state.selectedDimensions
      );
      state.tableRowStatusByDimension = buildRowStatusByDimensionMap(
        state.analyzingMetrics,
        state.selectedDimensions
      );
      state.waterfallRows = buildWaterfall(
        state.analyzingMetrics,
        state.selectedDimensions
      );
      state.isLoading = false;
    },

    setMode: (state, action: PayloadAction<"impact" | "outlier">) => {
      state.mode = action.payload;
      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        true,
        state.mode,
        state.selectedDimensions
      );
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
    updateSelectedDimensions: (state, action: PayloadAction<string[]>) => {
      if (action.payload.length === 0) {
        state.selectedDimensions = Object.values(
          state.analyzingMetrics.dimensions
        ).map((d) => d.name);
      } else {
        state.selectedDimensions = action.payload;
      }

      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        true,
        state.mode,
        state.selectedDimensions
      );
      state.tableRowStatusByDimension = buildRowStatusByDimensionMap(
        state.analyzingMetrics,
        state.selectedDimensions
      );
      state.waterfallRows = buildWaterfall(
        state.analyzingMetrics,
        state.selectedDimensions
      );
    },
    toggleGroupRows: (state, action: PayloadAction<void>) => {
      state.groupRows = !state.groupRows;
      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        state.groupRows,
        state.mode,
        state.selectedDimensions
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
  setMode,
  updateSelectedDimensions,
} = comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
