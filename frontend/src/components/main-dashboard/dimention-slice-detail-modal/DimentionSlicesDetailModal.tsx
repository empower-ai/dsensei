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

export function DimensionSliceDetailModal() {
  const { analyzingMetrics, selectedSliceKey } = useSelector(
    (state: RootState) => state.comparisonInsight
  );

  if (!selectedSliceKey) {
    return null;
  }

  const matchingRegex =
    getRegexMatchPatternForDimensionSliceKey(selectedSliceKey);

  const relatedSliceInfo = Array.from(
    analyzingMetrics.dimensionSliceInfo.keys()
  )
    .filter((key) => key.match(matchingRegex))
    .map((key) => analyzingMetrics.dimensionSliceInfo.get(key)!);

  const maxImpact = Math.max(
    ...relatedSliceInfo.map((info) => Math.abs(info.impact))
  );

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
            {formatDimensionSliceKeyForRendering(selectedSliceKey)}
          </p>
        </Flex>
        <Divider />
        <Flex justifyContent="start">
          <div className="text-start">
            <Title>Other Slices under the Same Dimension(s)</Title>
            <Subtitle>
              Showing the slices with noticeable impact under dimension(s):
              <span className="mx-1" />
              <Bold>
                {selectedSliceKey
                  .map((subKey) => subKey.dimension)
                  .sort()
                  .join(", ")}
              </Bold>
            </Subtitle>
            {/* <Text className="mt-3">Select Additional Filters:</Text>
            <div>
              <input type="checkbox" /> <label>asd</label>
            </div>
            <div>
              <input type="checkbox" /> <label>asd</label>
            </div> */}
          </div>
        </Flex>
        <Flex className="justify-center mt-5">
          <Card className="w-[80%]">
            <Flex justifyContent="center">
              <Title>Revenue</Title>
            </Flex>
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
                          <Text
                            color={sliceInfo.impact > 0 ? "emerald" : "rose"}
                          >
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
          </Card>
        </Flex>
      </form>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
