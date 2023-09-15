import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import {
  Col,
  Grid,
  Text, TextInput
} from "@tremor/react";
import { useState } from "react";
import {
  AggregationType,
  MetricColumn,
  TargetDirection
} from "../../../types/report-config";
import SelectorWithFilter from "../SelectorWithFilter";
import SingleSelector from "../SingleSelector";

type Props = {
  getValidMetricColumns: () => string[];
  metricColumn?: MetricColumn;
  setMetricColumn: (metricColumn: MetricColumn) => void;
  targetDirection: TargetDirection;
  setTargetDirection: (direction: TargetDirection) => void;
}


const MetricConfig = (props: Props) => {
  const { getValidMetricColumns, metricColumn, setMetricColumn, targetDirection, setTargetDirection } = props;
  const metricType = metricColumn?.aggregationOption;
  const singularMetric = metricColumn?.singularMetric;
  const ratioMetric = metricColumn?.ratioMetric;

  const [numeratorHasFilter, setNumeratorHasFilter] = useState(false);
  const [denominatorHasFilter, setDenominatorHasFilter] = useState(false);

  const singularMetrics = () => {
    return (
      <>
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              Select the metric column
            </Text>
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
              }
            })
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
                  }
                })
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
                }
              }
            })
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
                }
              }
            })
          }}

          filterCheckbox
          onFilterChange={(value) => {
            setMetricColumn({
              ...metricColumn,
              ratioMetric: {
                ...ratioMetric,
                numerator: {
                  ...ratioMetric?.numerator,
                  filter: undefined
                }
            }});
            setNumeratorHasFilter(value)
          }}
        />
        { numeratorHasFilter &&
          <SelectorWithFilter
            title={
              <Text className="pr-4 text-black">
                Select the numerator metric filter
              </Text>
            }
            labels={getValidMetricColumns()}
            values={getValidMetricColumns()}
            selectedValue={ratioMetric?.numerator?.filter?.column || ""}
            onColumnChange={(metric) => {
              setMetricColumn({
                ...metricColumn,
                ratioMetric: {
                  ...ratioMetric,
                  numerator: {
                    ...ratioMetric?.numerator,
                    filter: {
                      ...ratioMetric?.numerator?.filter,
                      column: metric,
                    }
                  }
                }
              })
            }}
            onValueChange={(metric) => {
              setMetricColumn({
                ...metricColumn,
                ratioMetric: {
                  ...ratioMetric,
                  numerator: {
                    ...ratioMetric?.numerator,
                    filter: {
                      ...ratioMetric?.numerator?.filter,
                      value: metric,
                    }
                  }
                }
              })
            }}
          />
        }

        {/* Demoninator config */}
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
                }
              }
            })
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
                }
              }
            })
          }}
          filterCheckbox
          onFilterChange={(value) => {
            setMetricColumn({
              ...metricColumn,
              ratioMetric: {
                ...ratioMetric,
                denominator: {
                  ...ratioMetric?.denominator,
                  filter: undefined
                }
            }});
            setDenominatorHasFilter(value);
          }}
        />

        { denominatorHasFilter &&
          <SelectorWithFilter
            title={
              <Text className="pr-4 text-black">
                Select the denominator metric filter
              </Text>
            }
            labels={getValidMetricColumns()}
            values={getValidMetricColumns()}
            selectedValue={ratioMetric?.denominator?.filter?.column || ""}
            onColumnChange={(metric) => {
              setMetricColumn({
                ...metricColumn,
                ratioMetric: {
                  ...ratioMetric,
                  denominator: {
                    ...ratioMetric?.denominator,
                    filter: {
                      ...ratioMetric?.denominator?.filter,
                      column: metric,
                    }
                  }
                }
              })
            }
            }
            onValueChange={(metric) => {
              setMetricColumn({
                ...metricColumn,
                ratioMetric: {
                  ...ratioMetric,
                  denominator: {
                    ...ratioMetric?.denominator,
                    filter: {
                      ...ratioMetric?.denominator?.filter,
                      value: metric,
                    }
                  }
                }
              })
            }}
          />
        }
      </>
    );
  };

  return (
    <>
      <SingleSelector
        title={
          <Text className="pr-4 text-black">
            Select the metric type
          </Text>
        }
        labels={["Sum", "Count", "Distinct", "Ratio"]}
        values={["sum", "count", "nunique", "ratio"]}
        selectedValue={metricType ? metricType : ""}
        onValueChange={(metric) => {
          setMetricColumn({
            aggregationOption: metric as AggregationType,
          })
        }}
      />

      {metricType === "ratio" ? complexMetrics() : singularMetrics()}

      <SingleSelector
        title={
          <Text className="pr-4 text-black">Target metric direction</Text>
        }
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
}

export default MetricConfig;
