export interface DateRange {
  startDate: Date;
  endDate: Date;
}
export interface InsightMetric {
  name: string;
  baselineValue: number;
  baselineValueByDate: {
    date: Date;
    value: number;
  }[];
  baselineNumRows: number;
  comparisonValue: number;
  comparisonValueByDate: {
    date: Date;
    value: number;
  }[];
  comparisonNumRows: number;
  baselineDateRange: DateRange;
  comparisonDateRange: DateRange;
  topDriverSliceKeys: [DimensionSliceKey];
  dimensions: Map<string, string[]>;
  dimensionSliceInfo: Map<string, DimensionSliceInfo>;
}

export interface Dimension {
  name: string;
  values: Array<string>;
}

// export interface DimensionSlice {
//   dimension: DimensionSliceKey;
//   impactScore: number;
// }

export type DimensionSliceKey = [
  {
    dimension: string;
    value: string;
  }
];

export interface DimensionSliceInfo {
  key: DimensionSliceKey;
  topDrivingDimensionSliceKeys: DimensionSliceKey[];
  baselineValue: {
    sliceSize: number;
    sliceCount: number;
  };
  comparisonValue: {
    sliceSize: number;
    sliceCount: number;
  };
  impact: number;
}
