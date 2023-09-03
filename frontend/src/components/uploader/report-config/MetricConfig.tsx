import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import {
  Text
} from "@tremor/react";
import {
  AggregationType,
  MetricColumn,
  TargetDirection
} from "../../../types/report-config";
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
  const metricColumns = metricColumn?.columnNames;
  const metricColumnsType = metricColumn?.columnAggregationTypes;

  const singularMetrics = () => {
    return (
      <SingleSelector
        title={
          <Text className="pr-4 text-black">
            Select the metric column
          </Text>
        }
        labels={getValidMetricColumns()}
        values={getValidMetricColumns()}
        selectedValue={metricColumns ? metricColumns[0] : ""}
        onValueChange={(metric) => {
          setMetricColumn({
            ...metricColumn,
            columnNames: [metric],
          })
        }}
    />);
  };

  const complexMetrics = () => {
    return (
      <>
        {/* Numerator config */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              Select the numerator metric type
            </Text>
          }
          labels={["Sum", "Count", "Distinct"]}
          values={["sum", "count", "nunique"]}
          selectedValue={metricColumnsType ? metricColumnsType[0] : ""}
          onValueChange={(metric) => {
            // setMetricColumnsType([metric as AggregationType, metricColumnsType[1]]);
            setMetricColumn({
              ...metricColumn,
              columnAggregationTypes: [metric as AggregationType, metricColumnsType ? metricColumnsType[1] : "sum"],
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
          selectedValue={metricColumns ? metricColumns[0] : ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              columnNames: [metric, metricColumns ? metricColumns[1] : ""],
            })
          }}
        />

        {/* Demoninator config */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">
              Select the denominator metric type
            </Text>
          }
          labels={["Sum", "Count", "Distinct"]}
          values={["sum", "count", "nunique"]}
          selectedValue={metricColumnsType ? metricColumnsType[1] : ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              columnAggregationTypes: [metricColumnsType ? metricColumnsType[0] : "sum", metric as AggregationType],
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
          selectedValue={metricColumns ? metricColumns[1] : ""}
          onValueChange={(metric) => {
            setMetricColumn({
              ...metricColumn,
              columnNames: [metricColumns ? metricColumns[0] : "", metric],
            })
          }}
        />

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
            ...metricColumn,
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
