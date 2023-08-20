import { Bold, Divider, Flex, Subtitle, Text, Title } from "@tremor/react";
import { useSelector } from "react-redux";
import {
  formatDimensionSliceKeyForRendering,
  formatMetricName,
} from "../../../common/utils";
import { RootState } from "../../../store";
import { MetricOverviewTable } from "../MetricOverviewTable";
import { DimensionSliceDetailModalMetricCard } from "./DimensionSliceDetailModalMetricCard";

export function DimensionSliceDetailModal() {
  const { analyzingMetrics, relatedMetrics, selectedSliceKey, isLoading } =
    useSelector((state: RootState) => state.comparisonInsight);

  if (isLoading) {
    return null;
  }

  const allMetrics = [analyzingMetrics, ...relatedMetrics];

  if (!selectedSliceKey) {
    return <dialog id="slice_detail" className="modal"></dialog>;
  }

  const sliceInfo = analyzingMetrics.dimensionSliceInfo[selectedSliceKey];
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
          <Flex className="pt-3 gap-6">
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
                  metric.dimensionSliceInfo[selectedSliceKey].baselineValue
                    .sliceValue,
                comparisonValue:
                  metric.dimensionSliceInfo[selectedSliceKey].comparisonValue
                    .sliceValue,
              }))}
              metricName={formatMetricName(analyzingMetrics)}
            />
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
