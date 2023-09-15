import {
  Color,
  DeltaBar,
  Flex,
  Grid,
  List,
  ListItem,
  Subtitle,
  Text,
  Title,
} from "@tremor/react";
import { useEffect, useState } from "react";
import {
  DimensionSliceInfo,
  DimensionSliceKey,
  InsightMetric,
  SegmentKeyComponent,
} from "../../../common/types";
import {
  formatDimensionSliceKeyForRendering,
  formatMetricName,
  formatMetricValue,
  formatNumber,
  serializeDimensionSliceKey,
} from "../../../common/utils";

type Props = {
  selectedSliceKey: DimensionSliceKey;
  metric: InsightMetric;
  relatedSegmentsByMetricName: {
    [key: string]: DimensionSliceInfo[];
  };
  filteringSegmentKeyComponents: SegmentKeyComponent[];
};
export function DimensionSliceDetailModalMetricCard({
  selectedSliceKey,
  metric,
  relatedSegmentsByMetricName,
  filteringSegmentKeyComponents,
}: Props) {
  const [showAll, setShowAll] = useState<boolean>(false);

  useEffect(() => {
    setShowAll(false);
  }, [selectedSliceKey, filteringSegmentKeyComponents]);

  if (Object.keys(relatedSegmentsByMetricName).length === 0) {
    return null;
  }

  const relatedSegments = relatedSegmentsByMetricName[metric.name];

  const maxImpact = Math.max(
    ...relatedSegments.map((info) => Math.abs(info.impact))
  );

  const filteredRelatedSegments = relatedSegments
    .filter((segment) =>
      filteringSegmentKeyComponents.every((filteringKeyComponent) =>
        segment.key.find(
          (keyComponent) =>
            keyComponent.dimension === filteringKeyComponent.dimension &&
            keyComponent.value === filteringKeyComponent.value
        )
      )
    )
    .sort((segment1, segment2) => segment2.impact - segment1.impact);

  function renderSegment(sliceInfo: DimensionSliceInfo) {
    const isSelectedSegment =
      serializeDimensionSliceKey(sliceInfo?.key) ===
      serializeDimensionSliceKey(selectedSliceKey);

    let fontColor: Color = "gray";
    if (sliceInfo.impact > 0) {
      fontColor = "emerald";
    } else if (sliceInfo.impact < 0) {
      fontColor = "rose";
    }
    return (
      <ListItem className="justify-center">
        <Grid numItems={3} className="w-[100%] min-w-[1000px]">
          {formatDimensionSliceKeyForRendering(
            sliceInfo?.key!,
            undefined,
            true,
            "center",
            `flex-wrap col-span-1 gap-y-1 ${isSelectedSegment && "font-bold"}`
          )}
          <Flex justifyContent="center" className="space-x-4 col-span-2">
            <Grid numItems={3} className="w-[100%] gap-3">
              <Flex className="col-span-1" justifyContent="end">
                <Text color={fontColor} className="whitespace-normal">
                  {sliceInfo.impact > 0 ? "+" : ""}
                  {formatMetricValue(
                    sliceInfo.impact,
                    metric.aggregationMethod
                  )}{" "}
                  (
                  {sliceInfo.baselineValue.sliceValue === 0
                    ? "N/A"
                    : `${sliceInfo.impact > 0 ? "+" : ""}${formatNumber(
                        ((sliceInfo.comparisonValue.sliceValue -
                          sliceInfo.baselineValue.sliceValue) /
                          sliceInfo.baselineValue.sliceValue) *
                          100
                      )}%`}
                  )
                </Text>
              </Flex>
              <Flex className="col-span-2" justifyContent="start">
                <DeltaBar
                  value={(sliceInfo.impact / maxImpact) * 100}
                  className="col-span-2"
                />
              </Flex>
            </Grid>
          </Flex>
        </Grid>
      </ListItem>
    );
  }

  function renderSegments() {
    if (filteredRelatedSegments.length > 20 && !showAll) {
      return (
        <>
          {filteredRelatedSegments
            .slice(0, 5)
            .map((sliceInfo) => renderSegment(sliceInfo))}
          <Flex justifyContent="center" className="py-3">
            {filteredRelatedSegments.length - 10} segments skipped,
            <button
              className="btn-link text-sky-800 pl-1"
              onClick={() => setShowAll(true)}
            >
              show all
            </button>
          </Flex>
          {filteredRelatedSegments
            .slice(-5)
            .map((sliceInfo) => renderSegment(sliceInfo))}
        </>
      );
    }

    return filteredRelatedSegments.map((sliceInfo) => renderSegment(sliceInfo));
  }

  return (
    <Flex className="justify-center mt-5" flexDirection="col">
      <Flex justifyContent="center">
        <Title>Metrics: {formatMetricName(metric)}</Title>
      </Flex>
      <Grid numItems={3} className="w-[100%] min-w-[1000px]">
        <List className="col-span-3">
          <ListItem className="justify-center overflow-visible">
            <Grid numItems={3} className="w-[100%] min-w-[1000px]">
              <Flex justifyContent="center" className="col-span-1">
                <Subtitle>Segment</Subtitle>
              </Flex>
              <Flex
                justifyContent="center"
                alignItems="center"
                className="col-span-2 gap-2 overflow-visible"
              >
                <Subtitle className="col-span-2">
                  Change: absolute change (relative change)
                </Subtitle>
              </Flex>
            </Grid>
          </ListItem>
          {renderSegments()}
        </List>
      </Grid>
    </Flex>
  );
}
