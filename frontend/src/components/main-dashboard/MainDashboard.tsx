import {
  InboxIcon,
  QueueListIcon,
  Square2StackIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
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
import { Range } from "immutable";
import { ReactElement, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import apiManager from "../../common/apiManager";
import getSettings from "../../common/server-data/settings";
import Sidebar from "../../common/sidebar/Sidebar";
import SidebarElement from "../../common/sidebar/SidebarElement";
import { DimensionSliceKey, Filter, InsightMetric } from "../../common/types";
import {
  formatDateString,
  formatMetricName,
  formatMetricValue,
  formatNumber,
  renderDebugInfo,
} from "../../common/utils";
import { RootState } from "../../store";
import {
  setError,
  setLoadingStatus,
  updateMetrics,
} from "../../store/comparisonInsight";
import { DataSourceType, Schema } from "../../types/data-source";
import {
  DateRangeRelatedData,
  MetricColumn,
  TargetDirection,
} from "../../types/report-config";
import { DateRangeData } from "../uploader/DatePicker";
import { MetricOverviewTable } from "./MetricOverviewTable";
import { SidebarReportConfig } from "./SidebarReportConfig";
import TopDimensionSlicesTable from "./TopDimensionSlicesTable";
import { DimensionSliceDetailModal } from "./dimention-slice-detail-modal/DimentionSliceDetailModal";
import { WaterfallPanel } from "./waterfall/WaterfallPanel";

enum ReportingType {
  OVERVIEW,
  TOP_SEGMENTS,
  SEGMENTS_BY_DIMENSIONS,
  WATERFALL,
}

interface RouterState {
  tableName?: string;
  fileId?: string;
  dateRangeData: DateRangeRelatedData;
  metricColumn: MetricColumn;
  dateColumn: string;
  dateColumnType: string;
  groupByColumns: string[];
  dataSourceType: DataSourceType;
  targetDirection: TargetDirection;
  schema: Schema;
  rowCountByColumn: {
    [key: string]: number;
  };
  filters: Filter[];
  expectedValue: number;
  maxNumDimensions: number;
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
    dateRangeData,
    metricColumn,
    dateColumn,
    dateColumnType,
    groupByColumns,
    dataSourceType,
    targetDirection,
    expectedValue,
    schema,
    rowCountByColumn,
    filters,
    maxNumDimensions,
  } = routerState as RouterState;

  const {
    analyzingMetrics,
    relatedMetrics,
    tableRowStatus,
    tableRowCSV,
    tableRowStatusByDimension,
    groupRows,
    isLoading,
    waterfallRows,
    error,
  } = useSelector((state: RootState) => state.comparisonInsight);

  const navigate = useNavigate();
  useEffect(() => {
    dispatch(setLoadingStatus(true));
    const start = Date.now();
    async function loadInsight() {
      let apiPath = "";
      switch (dataSourceType) {
        case "csv":
          apiPath = "/api/v1/insight/file/metric";
          break;
        case "bigquery":
          apiPath = "/api/v1/insight/bigquery/metric";
          break;
      }

      const metricInsights = await apiManager.post<{
        [key: string]: InsightMetric;
      }>(apiPath, {
        tableName,
        fileId,
        baseDateRange: dateRangeData.baseDateRangeData.range,
        comparisonDateRange: dateRangeData.comparisonDateRangeData.range,
        dateColumn,
        dateColumnType,
        metricColumn,
        groupByColumns,
        expectedValue,
        filters,
        maxNumDimensions,
      });

      dispatch(updateMetrics(metricInsights));
      dispatch(setLoadingStatus(false));
      setDuration(formatNumber((Date.now() - start) / 1000));
    }

    loadInsight().catch(async (e) => {
      if (e.error === "UNKNOWN_ERROR") {
        throw e;
      }

      dispatch(setError(e.error));
      dispatch(setLoadingStatus(false));
    });
  }, [dateRangeData, fileId, dispatch]);

  function renderSidebar() {
    let reportMenuElements: ReactElement[] = [];

    if (isLoading) {
      reportMenuElements = [
        <Divider key="loading-divider" />,
        <Flex justifyContent="center" key="loading">
          <span className="loading loading-bars loading-sm"></span>
        </Flex>,
      ];
    }
    if (!isLoading) {
      if (!error) {
        reportMenuElements = [
          <Divider key="report-menu-divider" />,
          <SidebarElement
            text="Overview"
            icon={Square2StackIcon}
            isSelected={reportingType === ReportingType.OVERVIEW}
            onClick={() => {
              setReportingType(ReportingType.OVERVIEW);
            }}
            key="overview"
          />,
          <SidebarElement
            text="Top Driving Segments"
            icon={QueueListIcon}
            isSelected={reportingType === ReportingType.TOP_SEGMENTS}
            onClick={() => {
              setReportingType(ReportingType.TOP_SEGMENTS);
            }}
            key="top-driving-segments"
          />,
          <SidebarElement
            text="Segments by Dimensions"
            icon={Squares2X2Icon}
            isSelected={reportingType === ReportingType.SEGMENTS_BY_DIMENSIONS}
            onClick={() => {
              setReportingType(ReportingType.SEGMENTS_BY_DIMENSIONS);
            }}
            key="segments-by-dimensions"
          />,
        ];
        if (!metricColumn.ratioMetric) {
          reportMenuElements.push(
            <SidebarElement
              text="Waterfall Chart"
              icon={Squares2X2Icon}
              isSelected={reportingType === ReportingType.WATERFALL}
              onClick={() => {
                setReportingType(ReportingType.WATERFALL);
              }}
              key="waterfall-chart"
            />
          );
        }
      }
    }

    return (
      <Sidebar
        elements={[
          <SidebarElement
            text="New Report"
            icon={InboxIcon}
            key="new-report"
          />,
          ...reportMenuElements,
          <Divider key="new-report-divider" />,
          <SidebarReportConfig
            schema={schema}
            filters={filters}
            key="report-config"
            dateColumn={dateColumn}
            dateRangeData={dateRangeData}
            allDimensions={schema.fields
              .map((h) => h.name)
              .filter(
                (h) =>
                  metricColumn?.singularMetric?.columnName !== h &&
                  metricColumn?.ratioMetric?.numerator?.columnName !== h &&
                  metricColumn?.ratioMetric?.denominator?.columnName !== h
              )
              .filter((h) => dateColumn !== h)
              .filter((h) => {
                if (Object.keys(rowCountByColumn).length === 0) {
                  return true;
                }

                return (
                  (rowCountByColumn[h] < 100 ||
                    rowCountByColumn[h] / schema.countRows < 0.01) &&
                  rowCountByColumn[h] > 0
                );
              })}
            dimensions={groupByColumns}
            onSubmit={(
              newFilters: Filter[],
              newDimensions: string[],
              newBaseDateRangeData: DateRangeData,
              newComparisonDateRangeData: DateRangeData
            ) => {
              navigate("/dashboard", {
                state: {
                  schema,
                  fileId,
                  rowCountByColumn,
                  tableName,
                  dataSourceType,
                  metricColumn,
                  dateColumn,
                  dateColumnType,
                  groupByColumns: newDimensions,
                  dateRangeData: {
                    baseDateRangeData: newBaseDateRangeData,
                    comparisonDateRangeData: newComparisonDateRangeData,
                    rowCountByDateColumn: dateRangeData.rowCountByDateColumn,
                  },
                  targetDirection,
                  expectedValue,
                  filters: newFilters,
                  maxNumDimensions,
                },
              });
              navigate(0);
            }}
          />,
        ]}
      />
    );
  }

  function renderMainContent() {
    if (error === "EMPTY_DATASET") {
      return (
        <Flex className="h-screen" justifyContent="center">
          <Text className="text-black">
            Empty dataset or no data after applying the filters. Please adjust
            the filters or
            <a href="/" className="text-sky-800 pl-1">
              start a new report
            </a>
            .
          </Text>
        </Flex>
      );
    }

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

    const chartData = allMetrics.map((metric) => ({
      metric,
      data: Range(0, maxIdx)
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
        }),
    }));

    const onReRunOnSegment = (key: DimensionSliceKey) => {
      const newFilters = [...filters];
      Object.values(key).forEach((keyComponent) => {
        const index = filters.findIndex(
          (filter) => filter.column === keyComponent.dimension
        );
        if (index > -1) {
          const existingFilter = newFilters[index];
          if (existingFilter.operator === "neq") {
            existingFilter.operator = "eq";
            existingFilter.values = [keyComponent.value];
          } else {
            if (!existingFilter.values!.includes(keyComponent.value)) {
              existingFilter.values!.push(keyComponent.value);
            }
          }
        } else {
          newFilters.push({
            column: keyComponent.dimension,
            operator: "eq",
            values: [keyComponent.value],
          });
        }
      });
      navigate("/dashboard", {
        state: {
          schema,
          fileId,
          rowCountByColumn,
          tableName,
          dataSourceType,
          metricColumn,
          dateColumn,
          dateColumnType,
          groupByColumns,
          dateRangeData,
          targetDirection,
          expectedValue,
          filters: newFilters,
          maxNumDimensions,
        },
      });
      navigate(0);
    };
    return (
      <>
        {reportingType === ReportingType.OVERVIEW && (
          <Flex className="gap-y-4 pt-10" flexDirection="col">
            <Title className="">Overview</Title>
            <Divider />
            <Flex justifyContent="end">Finished in {duration} second(s)</Flex>
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
                  <Text>{Object.keys(groupByColumns).length} in total</Text>
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
                <Flex justifyContent="center" className="gap-2">
                  <Title>Filters</Title>
                </Flex>
                <Flex
                  className="h-[100%]"
                  justifyContent="center"
                  alignItems="center"
                  flexDirection="col"
                >
                  {filters.length > 0 ? (
                    <div>
                      {filters.map((filter, idx) => (
                        <Text
                          key={`${filter.column}-${
                            filter.operator
                          }-${filter.values?.join("")}`}
                        >
                          {idx > 0 ? <Bold>AND </Bold> : null}
                          {filter.column}{" "}
                          <Bold>
                            {filter.operator === "eq"
                              ? "EQUALS"
                              : "DOES NOT EQUALS"}
                          </Bold>{" "}
                          {filter.values!.length > 1 ? (
                            <>
                              <Bold> ANY OF</Bold> [{filter.values?.join(", ")}]
                            </>
                          ) : (
                            filter.values![0]
                          )}
                        </Text>
                      ))}
                    </div>
                  ) : (
                    <Text>None</Text>
                  )}
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
                aggregationMethod: metric.aggregationMethod,
              }))}
              metricName={formatMetricName(analyzingMetrics)}
              aggregationMethod={analyzingMetrics.aggregationMethod}
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
                    <TabPanel key={data.metric.name}>
                      <LineChart
                        className="mt-6"
                        data={data.data}
                        index="date"
                        categories={["Base", "Comparison"]}
                        colors={["orange", "sky"]}
                        yAxisWidth={100}
                        valueFormatter={(v) =>
                          formatMetricValue(v, data.metric.aggregationMethod)
                        }
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
                    <TabPanel key={data.metric.name}>
                      <LineChart
                        className="mt-6"
                        data={data.data}
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
              onReRunOnSegment={onReRunOnSegment}
              showSensitiveControl={true}
            />
          </Flex>
        )}
        {reportingType === ReportingType.WATERFALL && (
          <Flex className="gap-y-4 pt-10" flexDirection="col">
            <Title>Waterfall View of Top Segments</Title>
            <Divider />
            <WaterfallPanel
              waterfallRows={waterfallRows}
              metric={analyzingMetrics}
              targetDirection="increasing"
              fileId={fileId!}
              filters={filters}
              dateColumn={dateColumn}
              metricColumn={metricColumn}
              baseDateRange={dateRangeData.baseDateRangeData.range}
              comparisonDateRange={dateRangeData.comparisonDateRangeData.range}
              dataSourceType={dataSourceType}
              onReRunOnSegment={onReRunOnSegment}
            />
          </Flex>
        )}
        {reportingType === ReportingType.SEGMENTS_BY_DIMENSIONS && (
          <Flex className="gap-y-4 pt-10" flexDirection="col">
            <Title>Top Segments by Dimension</Title>
            <Divider />
            {Object.values(analyzingMetrics.dimensions).map((dimension) => (
              <TopDimensionSlicesTable
                metric={analyzingMetrics}
                rowStatusMap={
                  tableRowStatusByDimension[dimension.name].rowStatus
                }
                rowCSV={tableRowStatusByDimension[dimension.name].rowCSV}
                dimension={dimension.name}
                maxDefaultRows={5}
                showDimensionSelector={false}
                showCalculationMode={false}
                showSensitiveControl={false}
                title={
                  <>
                    <Title>Dimension: {dimension.name}</Title>
                    {getSettings().showDebugInfo &&
                      renderDebugInfo("Score", dimension.score)}
                    <Divider />
                  </>
                }
                targetDirection={targetDirection}
                onReRunOnSegment={onReRunOnSegment}
                key={dimension.name}
              />
            ))}
          </Flex>
        )}
        <DimensionSliceDetailModal
          fileId={fileId!}
          filters={filters}
          targetDirection={targetDirection}
          dateColumn={dateColumn}
          groupByColumns={groupByColumns}
          metricColumn={metricColumn}
          baseDateRange={dateRangeData.baseDateRangeData.range}
          comparisonDateRange={dateRangeData.comparisonDateRangeData.range}
          dataSourceType={dataSourceType}
        />
      </>
    );
  }

  return (
    <>
      {renderSidebar()}
      <main className="pl-72 justify-center flex">
        <div className="max-w-[80%]">{renderMainContent()}</div>
      </main>
    </>
  );
}
