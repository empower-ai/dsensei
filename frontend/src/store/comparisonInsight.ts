import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  DimensionSliceInfo,
  DimensionSliceKey,
  InsightMetric,
} from "../common/types";
import { serializeDimensionSliceKey } from "../common/utils";

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
  tableRowStatus: {
    [key: string]: RowStatus;
  };
}

const dummyMetric = {
  name: "revenue",
  baselineValue: 1000,
  baselineValueByDate: [
    { date: new Date("2023-04-01"), value: 200 },
    { date: new Date("2023-04-02"), value: 205 },
    { date: new Date("2023-04-03"), value: 195 },
    { date: new Date("2023-04-04"), value: 193 },
    { date: new Date("2023-04-05"), value: 207 },
  ],
  baselineNumRows: 5,
  comparisonValue: 1050,
  comparisonValueByDate: [
    { date: new Date("2023-05-01"), value: 192 },
    { date: new Date("2023-05-02"), value: 218 },
    { date: new Date("2023-05-03"), value: 210 },
    { date: new Date("2023-05-04"), value: 224 },
    { date: new Date("2023-05-05"), value: 206 },
  ],
  comparisonNumRows: 5,
  baselineDateRange: {
    startDate: new Date("2023-04-01"),
    endDate: new Date("2023-04-05"),
  },
  comparisonDateRange: {
    startDate: new Date("2023-05-01"),
    endDate: new Date("2023-05-05"),
  },
  dimensions: new Map([
    ["country", ["USA", "China", "Cuba"]],
    ["device", ["ios", "android"]],
    ["brand", ["nike", "adidas"]],
  ]),
  topDriverSliceKeys: [
    [
      {
        dimension: "country",
        value: "USA",
      },
    ],
  ],
  dimensionSliceInfo: new Map([
    [
      "country:USA",
      {
        key: [
          {
            dimension: "country",
            value: "USA",
          },
        ],
        topDrivingDimensionSliceKeys: [
          [
            {
              dimension: "device",
              value: "ios",
            },
          ],
          [
            {
              dimension: "brand",
              value: "nike",
            },
          ],
        ],
        baselineValue: {
          sliceSize: 33.2,
          sliceCount: 3042,
        },
        comparisonValue: {
          sliceSize: 20.2,
          sliceCount: 2942,
        },
        impact: 1000,
      },
    ],
    [
      "device:ios",
      {
        key: [
          {
            dimension: "device",
            value: "ios",
          },
        ],
        topDrivingDimensionSliceKeys: [],
        baselineValue: {
          sliceSize: 11.2,
          sliceCount: 2042,
        },
        comparisonValue: {
          sliceSize: 14.2,
          sliceCount: 2142,
        },
        impact: 400,
      },
    ],
    [
      "brand:nike",
      {
        key: [
          {
            dimension: "brand",
            value: "nike",
          },
        ],
        topDrivingDimensionSliceKeys: [],
        baselineValue: {
          sliceSize: 24.2,
          sliceCount: 2242,
        },
        comparisonValue: {
          sliceSize: 20.2,
          sliceCount: 2122,
        },
        impact: -300,
      },
    ],
  ]),
};

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

const initialState: ComparisonInsightState = {
  analyzingMetrics: dummyMetric,
  relatedMetrics: [],
  tableRowStatus: buildRowStatusMap(dummyMetric),
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
  },
});

export const { toggleRow } = comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
