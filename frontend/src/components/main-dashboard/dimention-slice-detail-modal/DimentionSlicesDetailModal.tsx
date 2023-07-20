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

  const maxImpact = Math.max(...relatedSliceInfo.map((info) => info.impact));

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
          <p>{serializeDimensionSliceKey(selectedSliceKey)}</p>
        </Flex>
        <Divider />
        <Flex justifyContent="start">
          <div className="text-start">
            <Title>Other Slices</Title>
            <Subtitle>
              Showing the slices with noticeable impact under dimension(s):
              <span className="mx-1" />
              <Bold>
                {selectedSliceKey.map((subKey) => subKey.dimension).join(", ")}
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
        <Grid numItems={6}>
          <div className="col-span-2 col-start-2">
            <List>
              <ListItem className="justify-center">
                <Title>Slice</Title>
              </ListItem>
              {relatedSliceInfo.map((sliceInfo) => (
                <ListItem className="my-3 justify-center">
                  {serializeDimensionSliceKey(sliceInfo?.key!)}
                </ListItem>
              ))}
            </List>
          </div>
          <div className="col-span-2">
            <List>
              <ListItem className="justify-center">
                <Title>Impact</Title>
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
                        isIncreasePositive={sliceInfo.impact > 0}
                        className="w-[80%]"
                      />
                    </Flex>
                  </ListItem>
                );
              })}
            </List>
          </div>
        </Grid>
      </form>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
