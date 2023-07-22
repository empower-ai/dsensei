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
  Divider,
} from "@tremor/react";
import TopDimensionSlicesTable from "./TopDimensionSlicesTable";
import { ReactNode, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { DimensionSliceDetailModal } from "./dimention-slice-detail-modal/DimentionSliceDetailModal";
import { setLoadingStatus, updateMetrics } from "../../store/comparisonInsight";
import {
  formatDateString,
  formatMetricName,
  formatNumber,
} from "../../common/utils";
import { useLocation } from "react-router-dom";

export default function MainDashboard() {
  const dispatch = useDispatch();
  const routerState = useLocation().state;

  const {
    csvContent,
    baselineDateRange,
    comparisonDateRange,
    selectedColumns,
  } = routerState;

  useEffect(() => {
    dispatch(setLoadingStatus(true));
    fetch("http://127.0.0.1:5001/insight", {
      mode: "cors",
      method: "POST",
      body: JSON.stringify({
        csvContent,
        baselineDateRange,
        comparisonDateRange,
        selectedColumns,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => {
      res.json().then((json) => {
        dispatch(updateMetrics(json));
      });
    });
  }, [dispatch]);

  const {
    analyzingMetrics,
    relatedMetrics,
    tableRowStatus,
    tableRowStatusByDimension,
    isLoading,
  } = useSelector((state: RootState) => state.comparisonInsight);

  if (isLoading) {
    return (
      <Flex className="h-screen	gap-3" justifyContent="center">
        <p>Loading</p>
        <span className="loading loading-bars loading-lg"></span>
      </Flex>
    );
  }

  const allMetrics = [analyzingMetrics, ...relatedMetrics];
  const chartData = allMetrics.map((metric) =>
    (
      metric.baselineValueByDate.map((baselineValue) => ({
        date: formatDateString(baselineValue.date),
        Base: baselineValue.value,
      })) as any[]
    ).concat(
      metric.comparisonValueByDate.map((comparisonValue) => ({
        date: formatDateString(comparisonValue.date),
        Comparison: comparisonValue.value,
      }))
    )
  );

  function getChangePercentageBadge(num1: number, num2: number): ReactNode {
    if (num1 === 0) {
      return <Badge color="gray">N/A</Badge>;
    }

    const change = num2 - num1;
    const changePct = `${(((num2 - num1) / num1) * 100).toLocaleString(
      undefined,
      {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}%`;
    let deltaType: "unchanged" | "decrease" | "increase", content;
    if (num1 === num2) {
      content = "0";
      deltaType = "unchanged";
    } else if (num1 > num2) {
      content = `${formatNumber(change)} (${changePct})`;
      deltaType = "decrease";
    } else {
      content = `+${formatNumber(change)} (+${changePct})`;
      deltaType = "increase";
    }

    return (
      <BadgeDelta size="xs" deltaType={deltaType}>
        {content}
      </BadgeDelta>
    );
  }

  return (
    <main className="px-12 pt-20">
      <Flex justifyContent="end">
        <Text>
          Showing <Bold>{analyzingMetrics.topDriverSliceKeys.length}</Bold> top
          slices. Total of{" "}
          <Bold>{Object.keys(analyzingMetrics.dimensionSliceInfo).length}</Bold>{" "}
          slices analyzed.
        </Text>
      </Flex>
      <Grid numItems={4} className="gap-6 mt-6">
        <Card className="border-t-4 border-t-orange-500">
          <div className="h-[100%] grid">
            <div>
              <Title>Base Period</Title>
              <Text>
                {" "}
                {formatDateString(
                  analyzingMetrics.baselineDateRange[0]
                )} to {formatDateString(analyzingMetrics.baselineDateRange[1])}
              </Text>
              <Text>{analyzingMetrics.baselineNumRows} total rows</Text>
            </div>
            <div className="self-center text-center justify-self-center content-center">
              <Flex className="self-center text-center justify-self-center content-center">
                <Text className="self-end mr-2">
                  {formatMetricName(analyzingMetrics)}:
                </Text>
                <Metric className="flex">
                  <p className="px-2">
                    {analyzingMetrics.baselineValue.toLocaleString(undefined, {
                      style: "decimal",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </Metric>
              </Flex>
            </div>
            <div className="self-end content-center">
              <Text>
                <Bold>Supporting Metrics</Bold>
              </Text>
              <List>
                {relatedMetrics.map((metric) => (
                  <ListItem>
                    <Flex justifyContent="end" className="space-x-2.5">
                      <Text>{formatMetricName(metric)}:</Text>
                      <Title>{metric.baselineValue}</Title>
                    </Flex>
                  </ListItem>
                ))}
              </List>
            </div>
          </div>
        </Card>
        <Card className="border-t-4 border-t-sky-500">
          <div className="h-[100%] grid">
            <div>
              <Title>Comparison Period</Title>
              <Text>
                {formatDateString(analyzingMetrics.comparisonDateRange[0])} to{" "}
                {formatDateString(analyzingMetrics.comparisonDateRange[1])}
              </Text>
              <Text>{analyzingMetrics.comparisonNumRows} total rows</Text>
            </div>
            <div className="self-center text-center justify-self-center content-center">
              <Flex className="self-center text-center justify-self-center content-center">
                <Text className="self-end mr-2">
                  {formatMetricName(analyzingMetrics)}:
                </Text>
                <Metric className="mr-2">
                  {formatNumber(analyzingMetrics.comparisonValue)}
                </Metric>
                {getChangePercentageBadge(
                  analyzingMetrics.baselineValue,
                  analyzingMetrics.comparisonValue
                )}
              </Flex>
            </div>
            <div className="self-end content-center">
              <Text>
                <Bold>Supporting Metrics</Bold>
              </Text>
              <List>
                {relatedMetrics.map((metric) => (
                  <ListItem>
                    <Flex justifyContent="end" className="space-x-2.5">
                      <Text>{formatMetricName(metric)}:</Text>
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
                <Tab key={formatMetricName(metric)}>
                  {formatMetricName(metric)}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              {chartData.map((data) => (
                <TabPanel>
                  <LineChart
                    className="mt-6"
                    data={data}
                    index="date"
                    categories={["Base", "Comparison"]}
                    colors={["orange", "sky"]}
                    yAxisWidth={40}
                    valueFormatter={formatNumber}
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
                rowStatusMap={tableRowStatus}
                metric={analyzingMetrics}
                maxDefaultRows={100}
              />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-6 flex">
              <Card>
                {Object.keys(analyzingMetrics.dimensions).map((dimension) => (
                  <div className="mb-6">
                    <TopDimensionSlicesTable
                      metric={analyzingMetrics}
                      rowStatusMap={tableRowStatusByDimension[dimension]}
                      dimension={dimension}
                      maxDefaultRows={5}
                      title={
                        <>
                          <Title>Dimension: {dimension}</Title>
                          <Divider />
                        </>
                      }
                    />
                  </div>
                ))}
              </Card>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
      <DimensionSliceDetailModal />
    </main>
  );
}
