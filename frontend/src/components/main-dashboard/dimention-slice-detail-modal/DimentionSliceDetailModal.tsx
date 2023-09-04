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
import {
  formatDateString,
  formatDimensionSliceKeyForRendering,
  formatMetricName,
  formatNumber,
  serializeDimensionSliceKey,
} from "../../../common/utils";
import { RootState } from "../../../store";
import { DataSourceType } from "../../../types/data-source";
import {
  ColumnConfig,
  DateRangeConfig,
  MetricColumn,
  TargetDirection,
} from "../../../types/report-config";
import { MetricOverviewTable } from "../MetricOverviewTable";
import { DimensionSliceDetailModalMetricCard } from "./DimensionSliceDetailModalMetricCard";

interface Props {
  targetDirection: TargetDirection;
  fileId: string;
  selectedColumns: {
    [key: string]: ColumnConfig;
  };
  dateColumn: string;
  metricColumn: MetricColumn,
  groupByColumns: string[];
  baseDateRange: DateRangeConfig;
  comparisonDateRange: DateRangeConfig;
  dataSourceType: DataSourceType;
}

export function DimensionSliceDetailModal({
  targetDirection,
  fileId,
  selectedColumns,
  dateColumn,
  groupByColumns,
  metricColumn,
  baseDateRange,
  comparisonDateRange,
  dataSourceType,
}: Props) {
  const { analyzingMetrics, relatedMetrics, selectedSliceKey, isLoading } =
    useSelector((state: RootState) => state.comparisonInsight);
  const [chartData, setChartData] = useState<
    {
      date: string;
      Base: number;
      Comparison: number;
    }[][]
  >([]);
  const supportTImeSeries = dataSourceType === "csv"; // csv for now

  useEffect(() => {
    async function loadInsight() {
      const apiPath = "/api/segment-insight";
      const response = await fetch(
        process.env.NODE_ENV === "development"
          ? `http://127.0.0.1:5001${apiPath}`
          : apiPath,
        {
          mode: "cors",
          method: "POST",
          body: JSON.stringify({
            fileId,
            baseDateRange,
            dateColumn,
            groupByColumns,
            metricColumn,
            comparisonDateRange,
            selectedColumns,
            segmentKey: selectedSliceKey,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const insight = await response.json();

      const maxIdx = Math.max(
        insight[0].baselineValueByDate.length,
        insight[0].comparisonValueByDate.length
      );

      setChartData(
        allMetrics.map((metric, i) =>
          Range(0, maxIdx)
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
            })
        )
      );
    }

    if (selectedSliceKey && supportTImeSeries) {
      loadInsight().catch((e) => {
        throw e;
      });
    }
  }, [selectedSliceKey]);

  if (!selectedSliceKey && isLoading) {
    return null;
  }

  const allMetrics = [analyzingMetrics, ...relatedMetrics];

  if (!selectedSliceKey) {
    return <dialog id="slice_detail" className="modal"></dialog>;
  }

  const serializedKey = serializeDimensionSliceKey(selectedSliceKey);
  const sliceInfo = analyzingMetrics.dimensionSliceInfo[serializedKey];

  return (
    <dialog id="slice_detail" className="modal">
      <form method="dialog" className="modal-box max-w-[60%]">
        <Flex>
          <Title>Slice Detail</Title>
          <button className="btn btn-sm btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </Flex>
        <Flex>
          <p className="flex items-center gap-2">
            <Text>
              <Bold>Dimension Slice:</Bold>
            </Text>{" "}
            {formatDimensionSliceKeyForRendering(sliceInfo.key)}
          </p>
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
              }))}
              metricName={formatMetricName(analyzingMetrics)}
              targetDirection={targetDirection}
            />
            {supportTImeSeries && (
              <Card className="col-span-4">
                <Title>Day by Day Value</Title>
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
                      <TabPanel>
                        <LineChart
                          className="mt-6"
                          data={data}
                          index="date"
                          categories={["Base", "Comparison"]}
                          colors={["orange", "sky"]}
                          yAxisWidth={100}
                          valueFormatter={formatNumber}
                        />
                      </TabPanel>
                    ))}
                  </TabPanels>
                </TabGroup>
              </Card>
            )}
          </Flex>
        </Flex>
        <Divider />
        <Flex justifyContent="start">
          <div className="text-start">
            <Title>Other Slices under the Same Dimension(s)</Title>
            <Subtitle>
              Showing the slices with significant impact under dimension(s):
              <span className="mx-1" />
              <Bold>
                {sliceInfo.key
                  .map((subKey) => subKey.dimension)
                  .sort()
                  .join(", ")}
              </Bold>
            </Subtitle>
          </div>
        </Flex>
        {allMetrics.map((metric) => (
          <DimensionSliceDetailModalMetricCard
            selectedSliceKey={sliceInfo.key}
            metric={metric}
          />
        ))}
      </form>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
