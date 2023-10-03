import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { Col, Flex, Grid, Text, TextInput } from "@tremor/react";
import { useEffect, useState } from "react";
import { Schema } from "../../../types/data-source";
import {
  AggregationType,
  MetricColumn,
  TargetDirection,
} from "../../../types/report-config";
import { FiltersDropDown } from "../../common/FiltersDropdown";
import SingleSelector from "../SingleSelector";

type Props = {
  getValidMetricColumns: () => string[];
  metricColumn?: MetricColumn;
  setMetricColumn: (metricColumn: MetricColumn) => void;
  targetDirection: TargetDirection;
  setTargetDirection: (direction: TargetDirection) => void;
  schema: Schema;
};

const MetricConfig = (props: Props) => {
  const {
    getValidMetricColumns,
    metricColumn,
    setMetricColumn,
    targetDirection,
    setTargetDirection,
    schema,
  } = props;
  const metricType = metricColumn?.aggregationOption;
  const singularMetric = metricColumn?.singularMetric;
  const ratioMetric = metricColumn?.ratioMetric;

  const [numeratorHasFilter, setNumeratorHasFilter] = useState(
    (metricColumn?.ratioMetric?.numerator?.filters?.length ?? 0) > 0
  );
  const [denominatorHasFilter, setDenominatorHasFilter] = useState(
    (metricColumn?.ratioMetric?.denominator?.filters?.length ?? 0) > 0
  );

  useEffect(() => {
    if ((metricColumn?.ratioMetric?.numerator?.filters?.length ?? 0) > 0) {
      setNumeratorHasFilter(true);
    }
    if ((metricColumn?.ratioMetric?.denominator?.filters?.length ?? 0) > 0) {
      setDenominatorHasFilter(true);
    }
  }, [metricColumn]);

  const singularMetrics = () => {
    return (
      <>
        <SingleSelector
          title={
            <Text className="pr-4 text-black">Select the metric column</Text>
          }
          labels={getValidMetricColumns()}
          values={getValidMetricColumns()}
          selectedValue={singularMetric?.columnName || ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              singularMetric: {
                ...singularMetric,
                columnName: metric,
              },
            });
          }}
        />
      </>
    );
  };

  const complexMetrics = () => {
    return (
      <>
        {/* Numerator config */}
        <Grid numItems={5}>
          <Col className="flex items-center justify-end" numColSpan={2}>
            <Text className="pr-4 text-black">Metric name</Text>
          </Col>
          <Col className="items-center" numColSpan={3}>
            <TextInput
              title="Metric name"
              placeholder="Enter metric name"
              value={ratioMetric?.metricName || ""}
              onChange={(e) => {
                setMetricColumn({
                  ...metricColumn,
                  ratioMetric: {
                    ...ratioMetric,
                    metricName: e.target.value,
                  },
                });
              }}
            />
          </Col>
        </Grid>
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              Select the numerator metric type
            </Text>
          }
          labels={["Sum", "Count", "Distinct"]}
          values={["sum", "count", "nunique"]}
          selectedValue={ratioMetric?.numerator?.aggregationMethod || ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              ratioMetric: {
                ...ratioMetric,
                numerator: {
                  ...ratioMetric?.numerator,
                  aggregationMethod: metric as AggregationType,
                },
              },
            });
          }}
        />
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              Select the numerator metric column
            </Text>
          }
          labels={getValidMetricColumns()}
          values={getValidMetricColumns()}
          selectedValue={ratioMetric?.numerator?.columnName || ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              ratioMetric: {
                ...ratioMetric,
                numerator: {
                  ...ratioMetric?.numerator,
                  columnName: metric,
                },
              },
            });
          }}
        />
        <Grid numItems={5}>
          <Col className="flex items-center justify-end" numColSpan={2} />
          <Col className="flex items-center" numColSpan={3}>
            <Flex justifyContent="start" className="gap-2">
              <Text className="text-black block">Has filters: </Text>
              <input
                type="checkbox"
                onChange={() => {
                  setNumeratorHasFilter(!numeratorHasFilter);
                }}
                checked={numeratorHasFilter}
              />
              {numeratorHasFilter && (
                <FiltersDropDown
                  filters={ratioMetric?.numerator?.filters ?? []}
                  dimensions={getValidMetricColumns()}
                  schema={schema}
                  onFiltersChanged={(selectedFilters) =>
                    setMetricColumn({
                      ...metricColumn,
                      ratioMetric: {
                        ...ratioMetric,
                        numerator: {
                          ...ratioMetric?.numerator,
                          filters: selectedFilters,
                        },
                      },
                    })
                  }
                />
              )}
            </Flex>
          </Col>
        </Grid>
        {/* Denominator config */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              Select the denominator metric type
            </Text>
          }
          labels={["Sum", "Count", "Distinct"]}
          values={["sum", "count", "nunique"]}
          selectedValue={ratioMetric?.denominator?.aggregationMethod || ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              ratioMetric: {
                ...ratioMetric,
                denominator: {
                  ...ratioMetric?.denominator,
                  aggregationMethod: metric as AggregationType,
                },
              },
            });
          }}
        />
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              Select the denominator metric column
            </Text>
          }
          labels={getValidMetricColumns()}
          values={getValidMetricColumns()}
          selectedValue={ratioMetric?.denominator?.columnName || ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              ratioMetric: {
                ...ratioMetric,
                denominator: {
                  ...ratioMetric?.denominator,
                  columnName: metric,
                },
              },
            });
          }}
        />
        <Grid numItems={5}>
          <Col className="flex items-center justify-end" numColSpan={2} />
          <Col className="flex items-center" numColSpan={3}>
            <Flex justifyContent="start" className="gap-2">
              <Text className="text-black">Has filters: </Text>
              <input
                type="checkbox"
                onChange={() => {
                  setDenominatorHasFilter(!denominatorHasFilter);
                }}
                checked={denominatorHasFilter}
              />
              {denominatorHasFilter && (
                <FiltersDropDown
                  filters={ratioMetric?.denominator?.filters ?? []}
                  dimensions={getValidMetricColumns()}
                  schema={schema}
                  onFiltersChanged={(selectedFilters) =>
                    setMetricColumn({
                      ...metricColumn,
                      ratioMetric: {
                        ...ratioMetric,
                        denominator: {
                          ...ratioMetric?.denominator,
                          filters: selectedFilters,
                        },
                      },
                    })
                  }
                />
              )}
            </Flex>
          </Col>
        </Grid>
      </>
    );
  };

  return (
    <>
      <SingleSelector
        title={<Text className="pr-4 text-black">Select the metric type</Text>}
        labels={["Sum", "Count", "Distinct", "Ratio"]}
        values={["sum", "count", "nunique", "ratio"]}
        selectedValue={metricType ? metricType : ""}
        onValueChange={(metric) => {
          setMetricColumn({
            aggregationOption: metric as AggregationType,
          });
        }}
      />

      {metricType === "ratio" ? complexMetrics() : singularMetrics()}

      <SingleSelector
        title={<Text className="pr-4 text-black">Target metric direction</Text>}
        labels={["Increasing", "Decreasing"]}
        values={["increasing", "decreasing"]}
        icons={[ArrowUpIcon, ArrowDownIcon]}
        selectedValue={targetDirection}
        onValueChange={(v) => setTargetDirection(v as TargetDirection)}
        key="target-metric-direction"
        instruction={
          <Text>
            Target direction of the metric movement. E.g: "Increasing" for
            revenue and "Decreasing" for canceled orders.
          </Text>
        }
      />
    </>
  );
};

export default MetricConfig;
