export interface InsightMetric {
  name: string;
  keyDimensions: string[];
  totalSegments: number;
  expectedChangePercentage: number;
  aggregationMethod: string;
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
    [key: string]: Dimension;
  };
  dimensionSliceInfo: {
    [key: string]: DimensionSliceInfo;
  };
}

export interface Dimension {
  name: string;
  score: number;
}

export type SegmentKeyComponent = {
  dimension: string;
  value: string;
};

export type DimensionSliceKey = SegmentKeyComponent[];

export interface DimensionSliceInfo {
  key: DimensionSliceKey;
  serializedKey: string;
  absoluteContribution: number;
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
  changePercentage: number;
  changeDev: number;
  confidence: number;
}
