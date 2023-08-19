import {
  Bold,
  Card,
  Divider,
  Flex,
  Grid,
  LineChart,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Title,
} from "@tremor/react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  formatDateString,
  formatMetricName,
  formatNumber,
} from "../../common/utils";
import { RootState } from "../../store";
import { setLoadingStatus, updateMetrics } from "../../store/comparisonInsight";
import { MetricOverviewTable } from "./MetricOverviewTable";
import TopDimensionSlicesTable from "./TopDimensionSlicesTable";
import { DimensionSliceDetailModal } from "./dimention-slice-detail-modal/DimentionSliceDetailModal";

export default function MainDashboard() {
  const dispatch = useDispatch();
  const routerState = useLocation().state;

  const {
    tableName,
    fileId,
    baseDateRange,
    comparisonDateRange,
    selectedColumns,
    dataSourceType,
  } = routerState;

  useEffect(() => {
    async function loadInsight() {
      let apiPath = "";
      switch (dataSourceType) {
        case "csv":
          apiPath = "/api/insight";
          break;
        case "bigquery":
          apiPath = "/api/bqinsight";
          break;
        case "snowflake":
          apiPath = "/api/snowflake-insight";
          break;
      }

      dispatch(setLoadingStatus(true));
      const res = await fetch(
        process.env.NODE_ENV === "development"
          ? `http://127.0.0.1:5001${apiPath}`
          : apiPath,
        {
          mode: "cors",
          method: "POST",
          body: JSON.stringify({
            tableName,
            fileId,
            baseDateRange,
            comparisonDateRange,
            selectedColumns,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const jsonResult = await res.json();
      dispatch(updateMetrics(jsonResult));
    }

    loadInsight().catch((e) => {
      throw e;
    });
  }, [baseDateRange, comparisonDateRange, fileId, dispatch, selectedColumns]);

  const {
    analyzingMetrics,
    relatedMetrics,
    tableRowStatus,
    tableRowCSV,
    tableRowStatusByDimension,
    isLoading,
    groupRows,
    waterfallRows,
    selectedDimensions,
  } = useSelector((state: RootState) => state.comparisonInsight);

  if (isLoading) {
    return (
      <Flex className="h-screen	gap-3" justifyContent="center">
        <p>Processing</p>
        <span className="loading loading-bars loading-lg"></span>
      </Flex>
    );
  }

  const allMetrics = [analyzingMetrics, ...relatedMetrics];
  const chartData = allMetrics.map(
    (metric) =>
      metric.baselineValueByDate.map((baselineValue, idx) => ({
        date:
          formatDateString(baselineValue.date) +
          " / " +
          formatDateString(metric.comparisonValueByDate[idx].date),
        day: idx,
        Base: baselineValue.value,
        Comparison: metric.comparisonValueByDate[idx].value,
      })) as any[]
    // .concat(
    //   metric.comparisonValueByDate.map((comparisonValue, idx) => ({
    //     date: formatDateString(comparisonValue.date),
    //     day: idx,
    //     Comparison: comparisonValue.value,
    //   }))
    // )
  );

  return (
    <main className="px-12 pt-20 justify-center flex">
      <div className="max-w-[80%]">
        <Flex className="pt-2">
          {/* <Flex justifyContent="start" className="content-center gap-2">
          <Text>Dimensions:</Text>
          <MultiSelect
            className="w-auto min-w-[250px]"
            value={selectedDimensions}
            onValueChange={(value) => {
              dispatch(updateSelectedDimensions(value));
            }}
          >
            {Object.values(analyzingMetrics.dimensions).map((dimension) => (
              <MultiSelectItem
                className="cursor-pointer"
                value={dimension.name}
                key={dimension.name}
              >
                {dimension.name}
              </MultiSelectItem>
            ))}
          </MultiSelect>
        </Flex> */}
        </Flex>
        <Grid
          numItems={4}
          numItemsLg={4}
          numItemsMd={2}
          numItemsSm={1}
          className="gap-6 pt-4"
        >
          <Flex className="col-span-4">
            <Card>
              <Title>Overview</Title>
              <Divider />
              <Text>
                <Bold>Metric: </Bold>
                {formatMetricName(analyzingMetrics)}
              </Text>
              <Text>
                <Bold>Total segments: </Bold>
                {formatNumber(analyzingMetrics.totalSegments)}
              </Text>
              <Text>
                <Bold>Dimensions: </Bold>
                {Object.values(analyzingMetrics.dimensions)
                  .map((dimension) => dimension.name)
                  .join(", ")}
              </Text>
              <Divider />
              <MetricOverviewTable
                baseDateRange={analyzingMetrics.baselineDateRange}
                comparisonDateRange={analyzingMetrics.comparisonDateRange}
                baseNumRows={analyzingMetrics.baselineNumRows}
                comparisonNumRows={analyzingMetrics.comparisonNumRows}
                baseValue={analyzingMetrics.baselineValue}
                comparisonValue={analyzingMetrics.comparisonValue}
                supportingMetrics={relatedMetrics.map((metric) => ({
                  name: formatMetricName(metric),
                  baseValue: metric.baselineValue,
                  comparisonValue: metric.comparisonValue,
                }))}
                metricName={formatMetricName(analyzingMetrics)}
              />
            </Card>
          </Flex>
          <Card className="col-span-4">
            <Title>Day by Day Comparison</Title>
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
            <Tab>Top Segments</Tab>
            {/* <Tab>Waterfall</Tab> */}
            <Tab>Segments by Dimensions</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="mt-6">
                <TopDimensionSlicesTable
                  rowStatusMap={tableRowStatus}
                  rowCSV={tableRowCSV}
                  metric={analyzingMetrics}
                  maxDefaultRows={100}
                  groupRows={groupRows}
                  enableGroupToggle={true}
                  showDimensionSelector={true}
                  showCalculationMode={true}
                  title={
                    <>
                      <Flex flexDirection="col">
                        <Title>Top Segments Driving the Overall Change</Title>
                        <Text>Segments could have overlap</Text>
                      </Flex>
                      <Divider />
                    </>
                  }
                />
              </div>
            </TabPanel>
            {/* <WaterfallPanel
            waterfallRows={waterfallRows}
            metric={analyzingMetrics}
          /> */}
            <TabPanel>
              <div className="mt-6 flex">
                <Card className="overflow-overlay">
                  {selectedDimensions.map((dimension) => (
                    <div className="mb-6">
                      <TopDimensionSlicesTable
                        metric={analyzingMetrics}
                        rowStatusMap={
                          tableRowStatusByDimension[dimension].rowStatus
                        }
                        rowCSV={tableRowStatusByDimension[dimension].rowCSV}
                        dimension={dimension}
                        maxDefaultRows={5}
                        showDimensionSelector={false}
                        showCalculationMode={false}
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
      </div>
    </main>
  );
}
