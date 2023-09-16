import {
  Bold,
  Card,
  Divider,
  Flex,
  LineChart,
  Subtitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Title,
} from "@tremor/react";
import { Range } from "immutable";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Md5 } from "ts-md5";
import apiManager from "../../../common/apiManager";
import {
  DimensionSliceInfo,
  Filter,
  InsightMetric,
  SegmentKeyComponent,
} from "../../../common/types";
import {
  formatDateString,
  formatDimensionSliceKeyForRendering,
  formatMetricName,
  formatMetricValue,
  serializeDimensionSliceKey,
} from "../../../common/utils";
import { RootState } from "../../../store";
import { DataSourceType } from "../../../types/data-source";
import {
  DateRangeConfig,
  MetricColumn,
  TargetDirection,
} from "../../../types/report-config";
import { MetricOverviewTable } from "../MetricOverviewTable";
import { DimensionSliceDetailModalMetricCard } from "./DimensionSliceDetailModalMetricCard";

interface Props {
  targetDirection: TargetDirection;
  fileId: string;
  dateColumn: string;
  metricColumn: MetricColumn;
  groupByColumns: string[];
  baseDateRange: DateRangeConfig;
  comparisonDateRange: DateRangeConfig;
  dataSourceType: DataSourceType;
  filters: Filter[];
}

export function DimensionSliceDetailModal({
  targetDirection,
  fileId,
  dateColumn,
  groupByColumns,
  metricColumn,
  baseDateRange,
  comparisonDateRange,
  dataSourceType,
  filters,
}: Props) {
  const { analyzingMetrics, relatedMetrics, selectedSliceKey } = useSelector(
    (state: RootState) => state.comparisonInsight
  );
  const [chartData, setChartData] = useState<
    {
      metric: InsightMetric;
      data: {
        date: string;
        Base: number;
        Comparison: number;
      }[];
    }[]
  >([]);
  const [segmentInsightLoading, setSegmentInsightLoading] = useState(false);
  const [relatedSegmentsLoading, setRelatedSegmentsLoading] = useState(false);
  const [relatedSegmentsByMetricName, setRelatedSegmentsByMetricName] =
    useState<{
      [key: string]: DimensionSliceInfo[];
    }>({});
  const [filteringSegmentKeyComponents, setFilteringSegmentKeyComponents] =
    useState<SegmentKeyComponent[]>([]);
  const supportTImeSeries = dataSourceType === "csv"; // csv for now

  useEffect(() => {
    async function loadRelatedSegments() {
      setRelatedSegmentsLoading(true);
      const segments = await apiManager.post<{
        [key: string]: DimensionSliceInfo[];
      }>("/api/v1/insight/file/related-segments", {
        fileId,
        baseDateRange,
        comparisonDateRange,
        dateColumn,
        metricColumn,
        segmentKey: selectedSliceKey,
        filters,
      });

      setRelatedSegmentsByMetricName(segments);
      setRelatedSegmentsLoading(false);
    }
    async function loadInsight() {
      setSegmentInsightLoading(true);
      const insight = await apiManager.post<any>(
        "/api/v1/insight/file/segment",
        {
          fileId,
          baseDateRange,
          comparisonDateRange,
          dateColumn,
          groupByColumns,
          metricColumn,
          segmentKey: selectedSliceKey,
          filters,
        }
      );

      const maxIdx = Math.max(
        insight[0].baselineValueByDate.length,
        insight[0].comparisonValueByDate.length
      );

      setChartData(
        allMetrics.map((metric, i) => ({
          metric,
          data: Range(0, maxIdx)
            .toArray()
            .map((idx) => {
              const baselineValue = insight[i].baselineValueByDate[idx];
              const comparisonValue = insight[i].comparisonValueByDate[idx];
              let date, change;
              if (baselineValue && comparisonValue) {
                date = [
                  formatDateString(baselineValue.date),
                  formatDateString(comparisonValue.date),
                ].join(" / ");

                if (baselineValue.value !== 0) {
                  change =
                    ((comparisonValue.value - baselineValue.value) /
                      baselineValue.value) *
                    100;
                }
              } else if (baselineValue) {
                date = formatDateString(baselineValue.date);
              } else {
                date = formatDateString(comparisonValue.date);
              }

              return {
                date,
                Base: baselineValue?.value,
                Comparison: comparisonValue?.value,
                Difference: change,
              };
            }),
        }))
      );
      setSegmentInsightLoading(false);
    }

    setFilteringSegmentKeyComponents([]);

    if (selectedSliceKey && supportTImeSeries) {
      loadInsight();
      loadRelatedSegments();
    }
  }, [selectedSliceKey]);

  if (!selectedSliceKey) {
    return <dialog id="slice_detail" className="modal"></dialog>;
  }

  const allMetrics = [analyzingMetrics, ...relatedMetrics];
  const serializedKey = serializeDimensionSliceKey(selectedSliceKey);
  const sliceInfo = analyzingMetrics.dimensionSliceInfo[serializedKey];

  return (
    <dialog id="slice_detail" className="modal">
      <form method="dialog" className="modal-box max-w-[80%]">
        <Flex>
          <Title>Segment Detail</Title>
          <button className="btn btn-sm btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </Flex>
        <Flex justifyContent="center" className="gap-2">
          <Text>
            <Bold>Segment:</Bold>
          </Text>{" "}
          {formatDimensionSliceKeyForRendering(sliceInfo.key)}
        </Flex>
        <Divider />
        <Title>Metric Value</Title>
        <Flex justifyContent="center">
          <Flex className="pt-3 gap-6" flexDirection="col">
            <MetricOverviewTable
              baseDateRange={analyzingMetrics.baselineDateRange}
              comparisonDateRange={analyzingMetrics.comparisonDateRange}
              baseNumRows={sliceInfo.baselineValue.sliceCount}
              comparisonNumRows={sliceInfo.comparisonValue.sliceCount}
              baseValue={sliceInfo.baselineValue.sliceValue}
              comparisonValue={sliceInfo.comparisonValue.sliceValue}
              supportingMetrics={relatedMetrics.map((metric) => ({
                name: formatMetricName(metric),
                baseValue:
                  metric.dimensionSliceInfo[serializedKey].baselineValue
                    .sliceValue,
                comparisonValue:
                  metric.dimensionSliceInfo[serializedKey].comparisonValue
                    .sliceValue,
                aggregationMethod: metric.aggregationMethod,
              }))}
              metricName={formatMetricName(analyzingMetrics)}
              aggregationMethod={analyzingMetrics.aggregationMethod}
              targetDirection={targetDirection}
            />
            {supportTImeSeries && (
              <Card className="col-span-4">
                <Title>Day by Day Value</Title>
                {segmentInsightLoading ? (
                  <Flex className="gap-3" justifyContent="center">
                    <p>Processing</p>
                    <span className="loading loading-bars loading-lg"></span>
                  </Flex>
                ) : (
                  <TabGroup>
                    <TabList>
                      {allMetrics.map((metric) => (
                        <Tab key={formatMetricName(metric)}>
                          {formatMetricName(metric)}
                        </Tab>
                      ))}
                    </TabList>
                    <TabPanels>
                      {chartData.map((data) => (
                        <TabPanel key={data.metric.name}>
                          <LineChart
                            className="mt-6"
                            data={data.data}
                            index="date"
                            categories={["Base", "Comparison"]}
                            colors={["orange", "sky"]}
                            yAxisWidth={100}
                            valueFormatter={(v) =>
                              formatMetricValue(
                                v,
                                data.metric.aggregationMethod
                              )
                            }
                          />
                        </TabPanel>
                      ))}
                    </TabPanels>
                  </TabGroup>
                )}
              </Card>
            )}
          </Flex>
        </Flex>
        <Divider />
        <Flex flexDirection="col" alignItems="start">
          <Flex justifyContent="start" alignItems="start" flexDirection="col">
            <Title>Other Segments under the Same Dimension(s)</Title>
            <Subtitle>
              Showing segments with under dimension(s):
              <span className="mx-1" />
              <Bold>
                {sliceInfo.key
                  .map((subKey) => subKey.dimension)
                  .sort()
                  .join(", ")}
              </Bold>
            </Subtitle>
          </Flex>
          <div>
            <Text>Filters:</Text>
            <Flex
              alignItems="start"
              flexDirection="col"
              className="gap-y-2 pt-2"
            >
              {sliceInfo.key.map((keyComponent) => (
                <Flex
                  justifyContent="start"
                  className="gap-2 cursor-pointer"
                  key={Md5.hashStr(
                    `${keyComponent.dimension}-${keyComponent.value}`
                  )}
                  onClick={() => {
                    if (
                      filteringSegmentKeyComponents.find(
                        (filteringComponent) =>
                          filteringComponent.dimension ===
                            keyComponent.dimension &&
                          filteringComponent.value === keyComponent.value
                      )
                    ) {
                      setFilteringSegmentKeyComponents(
                        filteringSegmentKeyComponents.filter(
                          (filteringComponent) =>
                            filteringComponent.dimension !==
                              keyComponent.dimension ||
                            filteringComponent.value !== keyComponent.value
                        )
                      );
                    } else {
                      setFilteringSegmentKeyComponents(
                        filteringSegmentKeyComponents.concat([keyComponent])
                      );
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked={
                      filteringSegmentKeyComponents.find(
                        (filteringComponent) =>
                          filteringComponent.dimension ===
                            keyComponent.dimension &&
                          filteringComponent.value === keyComponent.value
                      ) !== undefined
                    }
                  />
                  {formatDimensionSliceKeyForRendering([keyComponent])}
                </Flex>
              ))}
            </Flex>
          </div>
        </Flex>
        <Card className="mt-4 overflow-overlay">
          {relatedSegmentsLoading ? (
            <Flex className="gap-3" justifyContent="center">
              <p>Processing</p>
              <span className="loading loading-bars loading-lg"></span>
            </Flex>
          ) : (
            <TabGroup>
              <TabList>
                {allMetrics.map((metric) => (
                  <Tab key={formatMetricName(metric)}>
                    {formatMetricName(metric)}
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                {allMetrics.map((metric) => (
                  <TabPanel key={metric.name}>
                    <DimensionSliceDetailModalMetricCard
                      selectedSliceKey={sliceInfo.key}
                      metric={metric}
                      relatedSegmentsByMetricName={relatedSegmentsByMetricName}
                      filteringSegmentKeyComponents={
                        filteringSegmentKeyComponents
                      }
                      key={metric.name}
                    />
                  </TabPanel>
                ))}
              </TabPanels>
            </TabGroup>
          )}
        </Card>
      </form>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
