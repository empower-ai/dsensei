import {
  Bold,
  Card,
  Divider,
  Flex,
  Grid,
  LineChart,
  MultiSelect,
  MultiSelectItem,
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
import {
  setLoadingStatus,
  updateMetrics,
  updateSelectedDimensions,
} from "../../store/comparisonInsight";
import { MetricCard } from "./MetricCard";
import TopDimensionSlicesTable from "./TopDimensionSlicesTable";
import { DimensionSliceDetailModal } from "./dimention-slice-detail-modal/DimentionSliceDetailModal";
import { WaterfallPanel } from "./panels/waterfall/WaterfallPanel";

export default function MainDashboard() {
  const dispatch = useDispatch();
  const routerState = useLocation().state;

  const { fileId, baseDateRange, comparisonDateRange, selectedColumns } =
    routerState;

  useEffect(() => {
    const apiPath = `/api/insight`;

    dispatch(setLoadingStatus(true));
    fetch(
      process.env.NODE_ENV === "development"
        ? `http://127.0.0.1:5001${apiPath}`
        : apiPath,
      {
        mode: "cors",
        method: "POST",
        body: JSON.stringify({
          fileId,
          baseDateRange,
          comparisonDateRange,
          selectedColumns,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => {
      res.json().then((json) => {
        dispatch(updateMetrics(json));
      });
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

  return (
    <main className="px-12 pt-20">
      <Flex className="pt-2">
        <Flex justifyContent="start" className="content-center gap-2">
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
        </Flex>
        <Flex justifyContent="end">
          <Text>
            Showing{" "}
            <Bold>
              {formatNumber(analyzingMetrics.topDriverSliceKeys.length)}
            </Bold>{" "}
            top segments. Total of{" "}
            <Bold>
              {formatNumber(
                Object.keys(analyzingMetrics.dimensionSliceInfo).length
              )}
            </Bold>{" "}
            segments analyzed.
          </Text>
        </Flex>
      </Flex>
      <Grid
        numItems={4}
        numItemsLg={4}
        numItemsMd={2}
        numItemsSm={1}
        className="gap-6 pt-4"
      >
        <MetricCard
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
          <Tab>Top Driving Segments</Tab>
          <Tab>Waterfall</Tab>
          <Tab>Dimensions</Tab>
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
          <WaterfallPanel
            waterfallRows={waterfallRows}
            metric={analyzingMetrics}
          />
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
    </main>
  );
}
