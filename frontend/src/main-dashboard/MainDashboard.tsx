import {
  Card,
  Grid,
  Title,
  Text,
  Tab,
  TabList,
  TabGroup,
  TabPanel,
  TabPanels,
  Metric,
  LineChart,
  BadgeDelta,
  Badge,
} from "@tremor/react";
import TopDimensionSlicesTable from "./TopDimensionSlicesTable";
import { InsightMetric } from "../common/types";
import { ReactNode } from "react";

const metric: InsightMetric = {
  name: "revenue",
  baselineValue: 1000,
  baselineValueByDate: [
    { date: new Date("2023-04-01"), value: 200 },
    { date: new Date("2023-04-02"), value: 205 },
    { date: new Date("2023-04-03"), value: 195 },
    { date: new Date("2023-04-04"), value: 193 },
    { date: new Date("2023-04-05"), value: 207 },
  ],
  baselineNumRows: 5,
  comparisonValue: 1050,
  comparisonValueByDate: [
    { date: new Date("2023-05-01"), value: 192 },
    { date: new Date("2023-05-02"), value: 218 },
    { date: new Date("2023-05-03"), value: 210 },
    { date: new Date("2023-05-04"), value: 224 },
    { date: new Date("2023-05-05"), value: 206 },
  ],
  comparisonNumRows: 5,
  baselineDateRange: {
    startDate: new Date("2023-04-01"),
    endDate: new Date("2023-04-05"),
  },
  comparisonDateRange: {
    startDate: new Date("2023-05-01"),
    endDate: new Date("2023-05-05"),
  },
  dimensions: new Map([
    ["country", ["USA", "China", "Cuba"]],
    ["device", ["ios", "android"]],
    ["brand", ["nike", "adidas"]],
  ]),
  topDriverSliceKeys: [
    [
      {
        dimension: "country",
        value: "USA",
      },
    ],
  ],
  dimensionSliceInfo: new Map([
    [
      "country:USA",
      {
        key: [
          {
            dimension: "country",
            value: "USA",
          },
        ],
        topDrivingDimensionSliceKeys: [
          [
            {
              dimension: "device",
              value: "ios",
            },
          ],
          [
            {
              dimension: "brand",
              value: "nike",
            },
          ],
        ],
        baselineValue: {
          sliceSize: 33.2,
          sliceCount: 3042,
        },
        comparisonValue: {
          sliceSize: 20.2,
          sliceCount: 2942,
        },
        impact: 1000,
      },
    ],
  ]),
};

// const dataFormatter = (number: number) =>
//   `${Intl.NumberFormat("us").format(number).toString()}%`;

const chartData = (
  metric.baselineValueByDate.map((baselineValue) => ({
    date: baselineValue.date.toDateString(),
    Baseline: baselineValue.value,
  })) as any[]
).concat(
  metric.comparisonValueByDate.map((comparisonValue) => ({
    date: comparisonValue.date.toDateString(),
    Comparison: comparisonValue.value,
  }))
);

function getChangePercentageBadge(num1: number, num2: number): ReactNode {
  if (num1 === 0) {
    return <Badge color="gray">N/A</Badge>;
  }

  const change = `${(((num2 - num1) / num1) * 100).toFixed(2)}%`;
  let deltaType: "unchanged" | "decrease" | "increase", content;
  if (num1 === num2) {
    content = "0";
    deltaType = "unchanged";
  } else if (num1 > num2) {
    content = `-${change}`;
    deltaType = "decrease";
  } else {
    content = `+${change}`;
    deltaType = "increase";
  }

  return <BadgeDelta deltaType={deltaType}>{content}</BadgeDelta>;
}

export default function MainDashboard() {
  return (
    <main className="px-12 py-12">
      <Title>Result</Title>
      <Text>Metric: {metric.name}</Text>

      <Grid numItems={4} className="gap-6 mt-6">
        <Card>
          <div className="h-[100%] grid">
            <div>
              <Title>Baseline Period</Title>
              <Text>Apr 1, 2022 to Apr 30, 2022</Text>
            </div>
            <div className="self-center text-center justify-self-center content-center">
              <Metric>{metric.baselineValue}</Metric>
              <div>
                <Text>1000 total rows</Text>
              </div>
            </div>
            <div></div>
          </div>
        </Card>
        <Card>
          <div className="h-[100%] grid">
            <div>
              <Title>Comparison Period</Title>
              <Text>Apr 1, 2022 to Apr 30, 2022</Text>
            </div>
            <div className="self-center text-center justify-self-center content-center">
              <Metric className="flex">
                <p className="px-2">{metric.comparisonValue}</p>
                {getChangePercentageBadge(
                  metric.baselineValue,
                  metric.comparisonValue
                )}
              </Metric>
              <div>
                <Text>1000 total rows</Text>
              </div>
            </div>
            <div></div>
          </div>
        </Card>
        <Card className="col-span-2">
          <LineChart
            className="mt-6"
            data={chartData}
            index="date"
            categories={["Baseline", "Comparison"]}
            colors={["emerald", "gray"]}
            // valueFormatter={dataFormatter}
            yAxisWidth={40}
          />
        </Card>
      </Grid>

      <TabGroup className="mt-6">
        <TabList>
          <Tab>Top Dimension Slices</Tab>
          <Tab>Dimensions</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-6">
              <TopDimensionSlicesTable metric={metric} />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-6">
              <Card>
                <div className="h-96" />
              </Card>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}
