import {
  Bold,
  Card,
  DeltaBar,
  Divider,
  Flex,
  Grid,
  List,
  ListItem,
  Subtitle,
  Text,
  Title,
} from "@tremor/react";
import { RootState } from "../../../store";
import { useSelector } from "react-redux";
import {
  formatDimensionSliceKeyForRendering,
  getRegexMatchPatternForDimensionSliceKey,
  serializeDimensionSliceKey,
} from "../../../common/utils";
import { DimensionSliceDetailModalMetricCard } from "./DimensionSliceDetailModalMetricCard";

export function DimensionSliceDetailModal() {
  const { analyzingMetrics, relatedMetrics, selectedSliceKey, isLoading } = useSelector(
    (state: RootState) => state.comparisonInsight
  );

  if (isLoading) {
    return null;
  }


  const allMetrics = [analyzingMetrics, ...relatedMetrics];

  if (!selectedSliceKey) {
    return null;
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
          <p className="flex items-center">
            {formatDimensionSliceKeyForRendering(sliceInfo.key)}
          </p>
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
