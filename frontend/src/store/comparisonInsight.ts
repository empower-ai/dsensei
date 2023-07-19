import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { InsightMetric } from "../common/types";

export interface ComparisonInsightState {
  analyzingMetrics: InsightMetric;
  relatedMetrics: InsightMetric[];
}

const initialState: ComparisonInsightState = {
  analyzingMetrics: {
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
  },
  relatedMetrics: [],
};

export const comparisonMetricsSlice = createSlice({
  name: "comparison-insight",
  initialState,
  reducers: {},
});

// export const { increment, decrement, incrementByAmount } =
// comparisonMetricsSlice.actions;

export default comparisonMetricsSlice.reducer;
