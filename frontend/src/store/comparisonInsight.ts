import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DimensionSliceKey, InsightMetric } from "../common/types";
import { Graph } from "../common/utils";

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
  hasCalculatedChildren: boolean;
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
  error?: string;
  groupRows: boolean;
  mode: "impact" | "outlier";
  sensitivity: "low" | "medium" | "high";
  shouldUsePScore: boolean;
}

const THRESHOLD = {
  low: 0.075,
  medium: 0.15,
  high: 0.25,
};

function helper(
  row: RowStatus,
  checkingKey: string,
  checkingKeyComponents: string[],
  connectedSegments: string[][],
  segmentToConnectedSegmentsIndex: {
    [key: string]: number;
  },
  maxNumChildren?: number
) {
  const rowKey = row.keyComponents.join("|");
  let rowKeys = [rowKey];
  const connectedSegmentsIndex = segmentToConnectedSegmentsIndex[rowKey];
  if (segmentToConnectedSegmentsIndex[rowKey]) {
    rowKeys = connectedSegments[connectedSegmentsIndex];
  }

  if (
    !rowKeys.find((rowKey) => {
      const rowKeyComponents = rowKey.split("|");
      return rowKeyComponents.every((component) =>
        checkingKeyComponents.includes(component)
      );
    })
  ) {
    return false;
  }

  const newRow = {
    key: [...row.key, checkingKey],
    keyComponents: checkingKeyComponents,
    isExpanded: false,
    children: {},
    hasCalculatedChildren: true,
  };

  let hasMatching = false;
  Object.values(row.children).forEach((child) => {
    if (
      helper(
        child,
        checkingKey,
        checkingKeyComponents,
        connectedSegments,
        segmentToConnectedSegmentsIndex,
        maxNumChildren
      )
    ) {
      hasMatching = true;
    }
  });

  if (
    !hasMatching &&
    (!maxNumChildren || Object.keys(row.children).length < maxNumChildren)
  ) {
    row.children[checkingKey] = newRow;
  }
  return true;
}

function buildWaterfall(metric: InsightMetric): {
  key: DimensionSliceKey;
  impact: number;
}[] {
  const [rows, _] = buildRowStatusMap(metric, true, "outlier", "medium", false);

  const result = [];
  for (const row of Object.values(rows)) {
    if (
      Object.keys(row.children).length <= 3 &&
      Object.keys(row.children).length > 0
    ) {
      Object.values(row.children).forEach((child) => result.push(child));
    } else {
      result.push(row);
    }
  }
  return result
    .map((res) => {
      const segment = metric.dimensionSliceInfo[res.keyComponents.join("|")];
      return {
        key: segment.key,
        impact: segment.impact,
      };
    })
    .slice(0, 8);
}

function buildRowStatusMap(
  metric: InsightMetric,
  groupRows: boolean,
  mode: "impact" | "outlier" = "impact",
  sensitivity: "low" | "medium" | "high" = "medium",
  shouldUsePScore: boolean
): [
  {
    [key: string]: RowStatus;
  },
  (number | string)[][]
] {
  let result: { [key: string]: RowStatus } = {};
  const resultInCSV: (number | string)[][] = [csvHeader];
  const filteredTopDriverSliceKeys = metric.topDriverSliceKeys;
  let topDriverSliceKeys = filteredTopDriverSliceKeys.filter((key) => {
    const sliceInfo = metric.dimensionSliceInfo[key];

    // Only show the slice if it has a significant impact or is an outlier
    const changeDev = sliceInfo.changeDev;
    return (
      mode === "impact" ||
      (changeDev > THRESHOLD[sensitivity] &&
        (!shouldUsePScore || sliceInfo.confidence < 0.05))
    );
  });

  const segmentToConnectedSegmentsIndex: {
    [key: string]: number;
  } = {};
  let connectedSegments: string[][] = [];
  const sortedTopDriverKeys = topDriverSliceKeys.sort((key1, key2) => {
    const keyComponents1 = key1.split("|");
    const keyComponents2 = key2.split("|");

    return keyComponents1.length - keyComponents2.length;
  });

  const connectedSegmentGraph = new Graph();
  sortedTopDriverKeys.forEach((key) => {
    connectedSegmentGraph.addVertex(key);
  });
  sortedTopDriverKeys.forEach((key, idx) => {
    const keyComponents = key.split("|");
    const sliceInfo = metric.dimensionSliceInfo[key];

    for (let i = 0; i < idx; ++i) {
      const checkingKey = sortedTopDriverKeys[i];
      const checkingKeyComponents = checkingKey.split("|");

      if (
        checkingKeyComponents.every((component) =>
          keyComponents.includes(component)
        )
      ) {
        const checkingSliceInfo = metric.dimensionSliceInfo[checkingKey];
        const sliceValue =
          sliceInfo.comparisonValue.sliceCount +
          sliceInfo.baselineValue.sliceCount;
        const checkingSliceValue =
          checkingSliceInfo.comparisonValue.sliceCount +
          checkingSliceInfo.baselineValue.sliceCount;

        if (
          Math.abs((sliceValue - checkingSliceValue) / checkingSliceValue) <
          0.05
        ) {
          connectedSegmentGraph.addEdge(key, checkingKey);
        }
      }
    }
  });

  connectedSegments = connectedSegmentGraph.connectedComponents();

  const segmentToRepresentingSegment: {
    [key: string]: string;
  } = {};

  connectedSegments.forEach((cluster, clusterIdx) => {
    if (cluster.length === 1) {
      return;
    }

    const key = cluster.sort((key1, key2) => {
      const keyComponents1 = key1.split("|");
      const keyComponents2 = key2.split("|");

      return keyComponents2.length - keyComponents1.length;
    })[0];
    cluster.forEach((element) => {
      segmentToRepresentingSegment[element] = key;
      segmentToConnectedSegmentsIndex[key] = clusterIdx;
    });
  });

  [...topDriverSliceKeys].forEach((key, idx) => {
    if (
      segmentToRepresentingSegment[key] &&
      segmentToRepresentingSegment[key] !== key
    ) {
      delete topDriverSliceKeys[idx];
    }
  });

  topDriverSliceKeys = topDriverSliceKeys
    .filter((key) => key)
    .sort((key1, key2) => {
      const segment1 = metric.dimensionSliceInfo[key1];
      const segment2 = metric.dimensionSliceInfo[key2];

      return Math.abs(segment2.sortValue) - Math.abs(segment1.sortValue);
    });

  if (!groupRows) {
    topDriverSliceKeys.forEach((key) => {
      result[key] = {
        key: [key],
        keyComponents: key.split("|"),
        isExpanded: false,
        children: {},
        hasCalculatedChildren: true,
      };
    });
  } else {
    topDriverSliceKeys.forEach((key) => {
      const keyComponents = key.split("|");
      let hasMatching = false;

      for (const child of Object.values(result)) {
        if (
          helper(
            child,
            key,
            keyComponents,
            connectedSegments,
            segmentToConnectedSegmentsIndex
          )
        ) {
          hasMatching = true;
        }

        if (hasMatching) {
          break;
        }
      }

      if (!hasMatching) {
        result[key] = {
          key: [key],
          keyComponents: keyComponents,
          isExpanded: false,
          children: {},
          hasCalculatedChildren: true,
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

  const dimensionSliceInfoSorted = Object.values(
    metric.dimensionSliceInfo
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
      hasCalculatedChildren: false,
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
  mode: "outlier",
  sensitivity: "medium",
  shouldUsePScore: true,
};

export const comparisonMetricsSlice = createSlice({
  name: "comparison-insight",
  initialState,
  reducers: {
    setLoadingStatus: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    updateMetrics: (
      state,
      action: PayloadAction<{ [key: string]: InsightMetric }>
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

      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        true,
        state.mode,
        state.sensitivity,
        state.shouldUsePScore
      );
      state.tableRowStatusByDimension = buildRowStatusByDimensionMap(
        state.analyzingMetrics
      );
      state.waterfallRows = buildWaterfall(state.analyzingMetrics);
      state.isLoading = false;
    },

    setMode: (state, action: PayloadAction<"impact" | "outlier">) => {
      state.mode = action.payload;
      state.groupRows = true;
      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        true,
        state.mode,
        state.sensitivity,
        state.shouldUsePScore
      );
    },
    setSensitivity: (
      state,
      action: PayloadAction<"low" | "medium" | "high">
    ) => {
      state.sensitivity = action.payload;
      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        true,
        state.mode,
        state.sensitivity,
        state.shouldUsePScore
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
      const { keyPath, dimension } = action.payload;
      keyPath.forEach((key) => {
        if (!rowStatus) {
          if (dimension) {
            rowStatus =
              state.tableRowStatusByDimension[dimension].rowStatus[key];

            if (!rowStatus.hasCalculatedChildren) {
              const dimensionSliceInfo = Object.values(
                state.analyzingMetrics.dimensionSliceInfo
              ).filter((sliceInfo) =>
                sliceInfo.key.find((k) => k.dimension === dimension)
              );
              // .sort((i1, i2) => Math.abs(i2.impact) - Math.abs(i1.impact));

              dimensionSliceInfo.forEach((sliceInfo) => {
                if (sliceInfo.key.length === 1) {
                  return;
                }

                const keyComponents = sliceInfo.key.map(
                  (keyPart) => `${keyPart.dimension}:${keyPart.value}`
                );
                helper(
                  rowStatus!,
                  sliceInfo.serializedKey,
                  keyComponents,
                  [],
                  {},
                  10
                );

                rowStatus!.hasCalculatedChildren = true;
              });
            }
          } else {
            rowStatus = state.tableRowStatus[key];
          }
        } else {
          rowStatus = rowStatus.children[key];
        }
      });

      if (rowStatus) {
        rowStatus.isExpanded = !rowStatus.isExpanded;
      }
    },
    selectSliceForDetail: (state, action: PayloadAction<DimensionSliceKey>) => {
      state.selectedSliceKey = action.payload;
    },
    toggleGroupRows: (state, action: PayloadAction<void>) => {
      state.groupRows = !state.groupRows;
      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        state.groupRows,
        state.mode,
        state.sensitivity,
        state.shouldUsePScore
      );
    },
    setShouldUsePScore: (state, action: PayloadAction<boolean>) => {
      state.shouldUsePScore = action.payload;
      [state.tableRowStatus, state.tableRowCSV] = buildRowStatusMap(
        state.analyzingMetrics,
        state.groupRows,
        state.mode,
        state.sensitivity,
        state.shouldUsePScore
      );
    },
  },
});

export const {
  toggleRow,
  selectSliceForDetail,
  updateMetrics,
  setLoadingStatus,
  setError,
  toggleGroupRows,
  setMode,
  setSensitivity,
  setShouldUsePScore,
} = comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
