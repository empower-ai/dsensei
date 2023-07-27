import { Card, Divider, Flex, Subtitle, TabPanel, Title } from "@tremor/react";
import { DimensionSliceKey, InsightMetric } from "../../../../common/types";
import { serializeDimensionSliceKey } from "../../../../common/utils";
import { csvHeader } from "../../../../store/comparisonInsight";
import TopDimensionSlicesTable from "../../TopDimensionSlicesTable";
import WaterfallChart from "./WaterfallChart";

interface Props {
  waterfallRows: {
    key: DimensionSliceKey;
    impact: number;
  }[];
  metric: InsightMetric;
}

export function WaterfallPanel({ metric, waterfallRows }: Props) {
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
    <TabPanel>
      <Card>
        <Flex justifyContent="center" className="flex-col pb-8">
          <WaterfallChart
            waterfallRows={waterfallRows}
            totalImpact={metric.comparisonValue - metric.baselineValue}
          />
          <Title>Waterfall Chart</Title>
          <Subtitle>Showing top 8 slices</Subtitle>
        </Flex>
        <TopDimensionSlicesTable
          rowStatusMap={rowStatus}
          rowCSV={rowCSV}
          metric={metric}
          maxDefaultRows={100}
          enableGroupToggle={false}
          title={
            <>
              <Flex flexDirection="col">
                <Title>
                  Top Segments Driving the Overall Change (No Overlap)
                </Title>
              </Flex>
              <Divider />
            </>
          }
        />
      </Card>
    </TabPanel>
  );
}
