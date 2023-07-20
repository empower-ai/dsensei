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
  topDriverSliceKeys: string[];
  dimensions: {
    [key: string]: string[];
  }
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
  topDrivingDimensionSliceKeys: string[];
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
