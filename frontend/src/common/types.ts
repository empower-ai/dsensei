export interface InsightMetric {
  name: string;
  baselineValue: number;
  baselineValueByDate: {
    date: string;
    value: number;
  }[];
  baselineNumRows: number;
  comparisonValue: number;
  comparisonValueByDate: {
    date: string;
    value: number;
  }[];
  comparisonNumRows: number;
  baselineDateRange: [string, string];
  comparisonDateRange: [string, string];
  topDriverSliceKeys: string[];
  dimensions: {
    [key: string]: { name: string; values: string[] };
  };
  dimensionSliceInfo: {
    [key: string]: DimensionSliceInfo;
  };
}

export interface Dimension {
  name: string;
  values: Array<string>;
}

// export interface DimensionSlice {
//   dimension: DimensionSliceKey;
//   impactScore: number;
// }

export type DimensionSliceKey = {
  dimension: string;
  value: string;
}[];

export interface DimensionSliceInfo {
  key: DimensionSliceKey;
  serializedKey: string;
  // topDrivingDimensionSliceKeys: string[];
  baselineValue: {
    sliceSize: number;
    sliceCount: number;
    sliceValue: number;
  };
  comparisonValue: {
    sliceSize: number;
    sliceCount: number;
    sliceValue: number;
  };
  impact: number;
}
