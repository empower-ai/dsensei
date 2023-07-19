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
import { InsightMetric } from "../../common/types";
import { ReactNode } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";

// const dataFormatter = (number: number) =>
//   `${Intl.NumberFormat("us").format(number).toString()}%`;

export default function MainDashboard() {
  const metric = useSelector(
    (state: RootState) => state.comparisonInsight.analyzingMetrics
  );

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
