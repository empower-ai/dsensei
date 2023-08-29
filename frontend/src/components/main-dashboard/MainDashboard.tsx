import {
  InboxIcon,
  QueueListIcon,
  Square2StackIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
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
import { Range } from "immutable";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import Sidebar from "../../common/sidebar/Sidebar";
import SidebarElement from "../../common/sidebar/SidebarElement";
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

enum ReportingType {
  OVERVIEW,
  TOP_SEGMENTS,
  SEGMENTS_BY_DIMENSIONS,
}

export default function MainDashboard() {
  const dispatch = useDispatch();
  const routerState = useLocation().state;
  const [duration, setDuration] = useState<string>();
  const [reportingType, setReportingType] = useState<ReportingType>(
    ReportingType.OVERVIEW
  );

  const {
    tableName,
    fileId,
    baseDateRange,
    comparisonDateRange,
    selectedColumns,
    dataSourceType,
    targetDirection,
  } = routerState;

  useEffect(() => {
    const start = Date.now();
    async function loadInsight() {
      let apiPath = "";
      switch (dataSourceType) {
        case "csv":
          apiPath = "/api/insight";
          break;
        case "bigquery":
          apiPath = "/api/bqinsight";
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
      setDuration(formatNumber((Date.now() - start) / 1000));
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
  const maxIdx = Math.max(
    allMetrics[0].baselineValueByDate.length,
    allMetrics[0].comparisonValueByDate.length
  );

  const chartData = allMetrics.map((metric) =>
    Range(0, maxIdx)
      .toArray()
      .map((idx) => {
        const baselineValue = metric.baselineValueByDate[idx];
        const comparisonValue = metric.comparisonValueByDate[idx];
        let date, change;
        if (baselineValue && comparisonValue) {
          date = [
            formatDateString(baselineValue.date),
            formatDateString(comparisonValue.date),
          ].join(" / ");

          if (baselineValue.value !== 0) {
            change =
              ((comparisonValue.value - baselineValue.value) /
                baselineValue.value) *
              100;
          }
        } else if (baselineValue) {
          date = formatDateString(baselineValue.date);
        } else {
          date = formatDateString(comparisonValue.date);
        }

        return {
          date,
          Base: baselineValue?.value,
          Comparison: comparisonValue?.value,
          Difference: change,
        };
      })
  );

  return (
    <>
      <Sidebar
        elements={[
          <SidebarElement text="New Report" icon={InboxIcon} />,
          <Divider />,
          <SidebarElement
            text="Overview"
            icon={Square2StackIcon}
            isSelected={reportingType === ReportingType.OVERVIEW}
            onClick={() => {
              setReportingType(ReportingType.OVERVIEW);
            }}
          />,
          <SidebarElement
            text="Top Driving Segments"
            icon={QueueListIcon}
            isSelected={reportingType === ReportingType.TOP_SEGMENTS}
            onClick={() => {
              setReportingType(ReportingType.TOP_SEGMENTS);
            }}
          />,
          <SidebarElement
            text="Segments by Dimensions"
            icon={Squares2X2Icon}
            isSelected={reportingType === ReportingType.SEGMENTS_BY_DIMENSIONS}
            onClick={() => {
              setReportingType(ReportingType.SEGMENTS_BY_DIMENSIONS);
            }}
          />,
        ]}
      />
      <main className="pl-72 justify-center flex">
        <div className="max-w-[80%]">
          {reportingType === ReportingType.OVERVIEW && (
            <Flex className="gap-y-4 pt-10" flexDirection="col">
              <Title className="">Overview</Title>
              <Divider />
              <Grid
                numItemsLg={4}
                numItemsMd={2}
                numItemsSm={2}
                className="gap-2"
              >
                <Card className="text-center flex flex-col gap-y-4">
                  <Title>Metrics</Title>
                  {relatedMetrics.length === 0 && (
                    <Flex
                      className="h-[100%]"
                      justifyContent="center"
                      alignItems="center"
                      flexDirection="col"
                    >
                      <Text>{formatMetricName(analyzingMetrics)}</Text>
                    </Flex>
                  )}
                  {relatedMetrics.length > 0 && (
                    <Flex
                      className="h-[100%] gap-y-2"
                      justifyContent="center"
                      alignItems="center"
                      flexDirection="col"
                    >
                      <Text className="text-black">Main:</Text>
                      <Text>{formatMetricName(analyzingMetrics)}</Text>
                      <Text className="text-black">Additional:</Text>
                      {relatedMetrics.map((metric) => (
                        <Text>{formatMetricName(metric)}</Text>
                      ))}
                    </Flex>
                  )}
                </Card>
                <Card className="text-center flex flex-col gap-y-4">
                  <Flex justifyContent="center" className="gap-2">
                    <Title>Dimensions</Title>
                    <Text>
                      {Object.keys(analyzingMetrics.dimensions).length} in total
                    </Text>
                  </Flex>
                  <Flex
                    className="h-[100%]"
                    justifyContent="center"
                    alignItems="center"
                    flexDirection="col"
                  >
                    <Text>
                      {Object.values(analyzingMetrics.dimensions)
                        .map((dimension) => dimension.name)
                        .sort()
                        .join(", ")}
                    </Text>
                  </Flex>
                </Card>
                <Card className="text-center flex flex-col gap-y-4">
                  <Title>Total Segments</Title>
                  <Flex
                    className="h-[100%]"
                    justifyContent="center"
                    alignItems="center"
                    flexDirection="col"
                  >
                    <Text>{formatNumber(analyzingMetrics.totalSegments)}</Text>
                  </Flex>
                </Card>
                <Card className="text-center flex flex-col gap-y-4">
                  <Title>Time Taken</Title>
                  <Flex
                    className="h-[100%]"
                    justifyContent="center"
                    alignItems="center"
                    flexDirection="col"
                  >
                    <Text>{duration} seconds</Text>
                  </Flex>
                </Card>
              </Grid>
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
                targetDirection={targetDirection}
              />
              <Card className="col-span-4">
                <Title>Day by Day Value</Title>
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
                          yAxisWidth={100}
                          valueFormatter={formatNumber}
                        />
                      </TabPanel>
                    ))}
                  </TabPanels>
                </TabGroup>
              </Card>
              <Card className="col-span-4">
                <Title>Day by Day Difference</Title>
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
                          categories={["Difference"]}
                          colors={["green"]}
                          yAxisWidth={40}
                          valueFormatter={(num) => `${formatNumber(num)}%`}
                        />
                      </TabPanel>
                    ))}
                  </TabPanels>
                </TabGroup>
              </Card>
            </Flex>
          )}
          {reportingType === ReportingType.TOP_SEGMENTS && (
            <Flex className="gap-y-4 pt-10" flexDirection="col">
              <Title>Top Segments Driving the Overall Change</Title>
              <Divider />
              <TopDimensionSlicesTable
                rowStatusMap={tableRowStatus}
                rowCSV={tableRowCSV}
                metric={analyzingMetrics}
                maxDefaultRows={100}
                groupRows={groupRows}
                enableGroupToggle={true}
                showDimensionSelector={true}
                showCalculationMode={true}
                targetDirection={targetDirection}
              />
            </Flex>
          )}
          {/* <WaterfallPanel
            waterfallRows={waterfallRows}
            metric={analyzingMetrics}
          /> */}
          {reportingType === ReportingType.SEGMENTS_BY_DIMENSIONS && (
            <Flex className="gap-y-4 pt-10" flexDirection="col">
              <Title>Top Segments Driving the Overall Change</Title>
              <Divider />
              {selectedDimensions.map((dimension) => (
                <TopDimensionSlicesTable
                  metric={analyzingMetrics}
                  rowStatusMap={tableRowStatusByDimension[dimension].rowStatus}
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
                  targetDirection={targetDirection}
                />
              ))}
            </Flex>
          )}
          <DimensionSliceDetailModal
            fileId={fileId}
            targetDirection={targetDirection}
            selectedColumns={selectedColumns}
            baseDateRange={baseDateRange}
            comparisonDateRange={comparisonDateRange}
            dataSourceType={dataSourceType}
          />
        </div>
      </main>
    </>
  );
}
