import {
  Card,
  DeltaBar,
  Flex,
  Grid,
  List,
  ListItem,
  Subtitle,
  Text,
  Title,
} from "@tremor/react";
import {
  formatDimensionSliceKeyForRendering,
  getRegexMatchPatternForDimensionSliceKey,
} from "../../../common/utils";
import { DimensionSliceKey, InsightMetric } from "../../../common/types";

type Props = {
  selectedSliceKey: DimensionSliceKey;
  metric: InsightMetric;
};
export function DimensionSliceDetailModalMetricCard({
  selectedSliceKey,
  metric,
}: Props) {
  const matchingRegex =
    getRegexMatchPatternForDimensionSliceKey(selectedSliceKey);

  const relatedSliceInfo = Array.from(metric.dimensionSliceInfo.keys())
    .filter((key) => key.match(matchingRegex))
    .map((key) => metric.dimensionSliceInfo.get(key)!);

  const maxImpact = Math.max(
    ...relatedSliceInfo.map((info) => Math.abs(info.impact))
  );
  return (
    <Flex className="justify-center mt-5">
      <Card className="w-[80%]">
        <Flex justifyContent="center">
          <Title>Metrics: {metric.name}</Title>
        </Flex>
        {relatedSliceInfo.length === 0 ? (
          <Flex justifyContent="center">
            <Subtitle>No slice with significant impact</Subtitle>
          </Flex>
        ) : (
          <Grid numItems={2}>
            <div>
              <List>
                <ListItem className="justify-center">
                  <Subtitle>Slice</Subtitle>
                </ListItem>
                {relatedSliceInfo.map((sliceInfo) => (
                  <ListItem className="my-3 justify-center">
                    {formatDimensionSliceKeyForRendering(
                      sliceInfo?.key!,
                      undefined,
                      false
                    )}
                  </ListItem>
                ))}
              </List>
            </div>
            <div>
              <List>
                <ListItem className="justify-center">
                  <Subtitle>Impact</Subtitle>
                </ListItem>
                {relatedSliceInfo.map((sliceInfo) => {
                  return (
                    <ListItem className="my-3">
                      <Flex
                        justifyContent="end"
                        alignItems="center"
                        className="space-x-4"
                      >
                        <Text color={sliceInfo.impact > 0 ? "emerald" : "rose"}>
                          {sliceInfo.impact > 0 ? "+" : ""}
                          {sliceInfo.impact}
                        </Text>
                        <DeltaBar
                          value={(sliceInfo.impact / maxImpact) * 100}
                          className="w-[80%]"
                        />
                      </Flex>
                    </ListItem>
                  );
                })}
              </List>
            </div>
          </Grid>
        )}
      </Card>
    </Flex>
  );
}
