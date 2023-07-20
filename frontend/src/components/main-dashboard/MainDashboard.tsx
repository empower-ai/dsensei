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
  Flex,
  List,
  ListItem,
  Bold,
} from "@tremor/react";
import TopDimensionSlicesTable from "./TopDimensionSlicesTable";
import { ReactNode, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { DimensionSliceDetailModal } from "./dimention-slice-detail-modal/DimentionSliceDetailModal";
import {
  setLoadingStatus,
  updateMetrics
} from "../../store/comparisonInsight";

// const dataFormatter = (number: number) =>
//   `${Intl.NumberFormat("us").format(number).toString()}%`;

export default function MainDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setLoadingStatus(true));
    fetch("http://127.0.0.1:5000/a", {mode: 'cors'}).then((res) => {
      res.json().then((json) => {
        dispatch(updateMetrics(json));
      }
    );
    });
  }, []);

  const { analyzingMetrics, relatedMetrics, tableRowStatus, isLoading } = useSelector(
    (state: RootState) => state.comparisonInsight
  );

  if (isLoading) {
    return <></>
  }

  const allMetrics = [analyzingMetrics, ...relatedMetrics];
  const chartData = allMetrics.map((metric) =>
    (
      metric.baselineValueByDate.map((baselineValue) => ({
        date: baselineValue.date,
        Baseline: baselineValue.value,
      })) as any[]
    ).concat(
      metric.comparisonValueByDate.map((comparisonValue) => ({
        date: comparisonValue.date,
        Comparison: comparisonValue.value,
      }))
    )
  );

  function getChangePercentageBadge(num1: number, num2: number): ReactNode {
    if (num1 === 0) {
      return <Badge color="gray">N/A</Badge>;
    }

    const change = num2 - num1;
    const changePct = `${(((num2 - num1) / num1) * 100).toFixed(2)}%`;
    let deltaType: "unchanged" | "decrease" | "increase", content;
    if (num1 === num2) {
      content = "0";
      deltaType = "unchanged";
    } else if (num1 > num2) {
      content = `${change.toFixed(2)} (${changePct})`;
      deltaType = "decrease";
    } else {
      content = `+${change.toFixed(2)} (+${changePct})`;
      deltaType = "increase";
    }

    return (
      <BadgeDelta size="xs" deltaType={deltaType}>
        {content}
      </BadgeDelta>
    );
  }

  return (
    <main className="px-12 py-12">
      <Title>Result</Title>
      <Text>Metric: {analyzingMetrics.name}</Text>
      <Grid numItems={4} className="gap-6 mt-6">
        <Card>
          <div className="h-[100%] grid">
            <div>
              <Title>Baseline Period</Title>
              <Text>Apr 1, 2022 to Apr 30, 2022</Text>
              <Text>1000 total rows</Text>
            </div>
            <div className="self-center text-center justify-self-center content-center">
              <Flex className="self-center text-center justify-self-center content-center">
                <Text className="self-end mr-2">{analyzingMetrics.name}:</Text>
                <Metric className="flex">
                  <p className="px-2">{analyzingMetrics.baselineValue.toFixed(2)}</p>
                </Metric>
              </Flex>
            </div>
            <div className="self-end content-center">
              <Text>
                <Bold>Related Metrics</Bold>
              </Text>
              <List>
                {relatedMetrics.map((metric) => (
                  <ListItem>
                    <Flex justifyContent="end" className="space-x-2.5">
                      <Text>{metric.name}:</Text>
                      <Title>{metric.baselineValue}</Title>
                    </Flex>
                  </ListItem>
                ))}
              </List>
            </div>
          </div>
        </Card>
        <Card>
          <div className="h-[100%] grid">
            <div>
              <Title>Comparison Period</Title>
              <Text>Apr 1, 2022 to Apr 30, 2022</Text>
              <Text>1000 total rows</Text>
            </div>
            <div className="self-center text-center justify-self-center content-center">
              <Flex className="self-center text-center justify-self-center content-center">
                <Text className="self-end mr-2">{analyzingMetrics.name}:</Text>
                <Metric>{analyzingMetrics.comparisonValue.toFixed(2)}</Metric>
                {getChangePercentageBadge(
                  analyzingMetrics.baselineValue,
                  analyzingMetrics.comparisonValue
                )}
              </Flex>
            </div>
            <div className="self-end content-center">
              <Text>
                <Bold>Related Metrics</Bold>
              </Text>
              <List>
                {relatedMetrics.map((metric) => (
                  <ListItem>
                    <Flex justifyContent="end" className="space-x-2.5">
                      <Text>{metric.name}:</Text>
                      <Title>{metric.comparisonValue}</Title>
                      {getChangePercentageBadge(
                        metric.baselineValue,
                        metric.comparisonValue
                      )}
                    </Flex>
                  </ListItem>
                ))}
              </List>
            </div>
          </div>
        </Card>
        <Card className="col-span-2">
          <Title>Charts</Title>
          <TabGroup>
            <TabList>
              {allMetrics.map((metric) => (
                <Tab key={metric.name}>{metric.name}</Tab>
              ))}
            </TabList>
            <TabPanels>
              {chartData.map((data) => (
                <TabPanel>
                  <LineChart
                    className="mt-6"
                    data={data}
                    index="date"
                    categories={["Baseline", "Comparison"]}
                    colors={["emerald", "gray"]}
                    yAxisWidth={40}
                  />
                </TabPanel>
              ))}
            </TabPanels>
          </TabGroup>
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
              <TopDimensionSlicesTable
                rowStatus={tableRowStatus}
                metric={analyzingMetrics}
              />
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
      <DimensionSliceDetailModal />
    </main>
  );
}
