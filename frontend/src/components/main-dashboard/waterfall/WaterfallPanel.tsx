import { Divider, Flex, Subtitle, Title } from "@tremor/react";
import { useEffect, useState } from "react";
import apiManager from "../../../common/apiManager";
import {
  DimensionSliceKey,
  Filter,
  InsightMetric,
} from "../../../common/types";
import { serializeDimensionSliceKey } from "../../../common/utils";
import { csvHeader } from "../../../store/comparisonInsight";
import { DataSourceType } from "../../../types/data-source";
import {
  DateRangeConfig,
  MetricColumn,
  TargetDirection,
} from "../../../types/report-config";
import TopDimensionSlicesTable from "../TopDimensionSlicesTable";
import WaterfallChart from "./WaterfallChart";

interface Props {
  waterfallRows: {
    key: DimensionSliceKey;
    impact: number;
  }[];
  metric: InsightMetric;
  targetDirection: TargetDirection;
  fileId: string;
  dateColumn: string;
  metricColumn: MetricColumn;
  baseDateRange: DateRangeConfig;
  comparisonDateRange: DateRangeConfig;
  dataSourceType: DataSourceType;
  filters: Filter[];
  onReRunOnSegment: (key: DimensionSliceKey) => void;
}

export function WaterfallPanel({
  metric,
  waterfallRows,
  targetDirection,
  fileId,
  dateColumn,
  metricColumn,
  baseDateRange,
  comparisonDateRange,
  dataSourceType,
  onReRunOnSegment,
  filters,
}: Props) {
  const [localWaterfallRows, setLocalWaterfallRows] = useState<
    {
      key: DimensionSliceKey;
      impact: number;
    }[]
  >(waterfallRows);
  const [waterfallInsight, setWaterfallInsight] = useState<
    {
      change: number;
      changeWithNoOverlap: number;
      key: DimensionSliceKey;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function loadWaterfallInsight(segmentKeys: DimensionSliceKey[]) {
    setIsLoading(true);
    const response = await apiManager.post<{
      [key: string]: {
        changeWithNoOverlap: number;
      };
    }>("/api/v1/insight/file/waterfall-insight", {
      fileId,
      baseDateRange,
      comparisonDateRange,
      dateColumn,
      metricColumn,
      segmentKeys,
      filters,
    });

    setWaterfallInsight(
      waterfallRows.map((row) => {
        return {
          key: row.key,
          change: row.impact,
          changeWithNoOverlap:
            response[serializeDimensionSliceKey(row.key)].changeWithNoOverlap,
        };
      })
    );
    setIsLoading(false);
  }

  useEffect(() => {
    loadWaterfallInsight(
      Object.values(localWaterfallRows).map((row) => row.key)
    );
  }, [localWaterfallRows]);

  const rowStatus = Object.fromEntries(
    waterfallRows.map((row) => {
      const serializedKey = serializeDimensionSliceKey(row.key);

      return [
        serializedKey,
        {
          key: [serializedKey],
          keyComponents: serializedKey.split("|"),
          isExpanded: false,
          children: {},
          hasCalculatedChildren: true,
        },
      ];
    })
  );

  const rowCSV: (number | string)[][] = [csvHeader];
  waterfallRows.forEach((row) => {
    const serializedKey = serializeDimensionSliceKey(row.key);
    const sliceInfo = metric.dimensionSliceInfo[serializedKey];
    rowCSV.push([
      sliceInfo.key.map((keyPart) => keyPart.dimension).join("|"),
      sliceInfo.key.map((keyPart) => keyPart.value).join("|"),
      sliceInfo.baselineValue.sliceSize,
      sliceInfo.comparisonValue.sliceSize,
      sliceInfo.baselineValue.sliceValue,
      sliceInfo.comparisonValue.sliceValue,
      sliceInfo.impact,
    ]);
  });

  return (
    <>
      <button
        onClick={async () => {
          apiManager.post<any>("/api/v1/insight/file/waterfall-insight", {
            fileId,
            baseDateRange,
            comparisonDateRange,
            dateColumn,
            metricColumn,
            segmentKeys: Object.keys(rowStatus).map((key) => {
              const segment = metric.dimensionSliceInfo[key];
              return segment.key;
            }),
            filters,
          });
        }}
      >
        test
      </button>
      <Flex justifyContent="center" className="flex-col pb-8">
        {!isLoading && (
          <WaterfallChart
            waterfallRows={waterfallInsight}
            totalImpact={metric.comparisonValue - metric.baselineValue}
          />
        )}
        {isLoading && (
          <Flex
            className="h-[400px] gap-2"
            justifyContent="center"
            alignItems="center"
          >
            <p>Loading</p>
            <span className="loading loading-bars loading-lg"></span>
          </Flex>
        )}
        <Title>Waterfall Chart</Title>
        <Subtitle>
          Showing segments' contribution with overlap excluded
        </Subtitle>
      </Flex>
      <TopDimensionSlicesTable
        rowStatusMap={Object.fromEntries(
          waterfallRows.map((row) => {
            const serializedKey = serializeDimensionSliceKey(row.key);

            return [
              serializedKey,
              {
                key: [serializedKey],
                keyComponents: serializedKey.split("|"),
                isExpanded: false,
                children: {},
                hasCalculatedChildren: true,
              },
            ];
          })
        )}
        rowCSV={rowCSV}
        metric={metric}
        maxDefaultRows={100}
        enableGroupToggle={false}
        showDimensionSelector={true}
        showCalculationMode={false}
        showSensitiveControl={false}
        onReRunOnSegment={onReRunOnSegment}
        title={
          <>
            <Flex flexDirection="col">
              <Title>Segments in chart</Title>
            </Flex>
            <Divider />
          </>
        }
        targetDirection={targetDirection}
      />
    </>
  );
}
