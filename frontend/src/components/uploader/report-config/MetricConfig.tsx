import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import {
  Text
} from "@tremor/react";
import { useEffect, useState } from "react";
import {
  AggregationType,
  ColumnType,
  MetricColumn,
  TargetDirection
} from "../../../types/report-config";
import SingleSelector from "../SingleSelector";

type Props = {
  getValidMetricColumns: () => string[];
  selectedColumns: { [key: string]: { type: string } };
  onSelectMetrics: (metrics: string[], type: ColumnType) => void;
  onSelectMetricAggregationOption: (metricColumn: MetricColumn, supportingMetric: boolean) => void;
  targetDirection: TargetDirection;
  setTargetDirection: (direction: TargetDirection) => void;
}


const MetricConfig = (props: Props) => {
  const { getValidMetricColumns, onSelectMetricAggregationOption, targetDirection, setTargetDirection } = props;
  const [metricType, setMetricType] = useState<AggregationType>("sum");
  const [metricColumns, setMetricColumns] = useState<string[]>(["", ""]);
  const [metricColumnsType, setMetricColumnsType] = useState<AggregationType[]>(["sum", "sum"]);

  useEffect(() => {
    if (metricColumns.length > 0) {
      onSelectMetricAggregationOption({
        columnNames: metricColumns,
        aggregationOption: metricType,
        columnAggregationTypes: metricType === "ratio" ? metricColumnsType : undefined,
      } as MetricColumn, false);
    }
  }, [metricColumns, metricType, metricColumnsType, onSelectMetricAggregationOption]);

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
        selectedValue={metricColumns[0]}
        onValueChange={(metric) => {
          setMetricColumns([metric])
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
          selectedValue={metricColumnsType[0]}
          onValueChange={(metric) => {
            setMetricColumnsType([metric as AggregationType, metricColumnsType[1]]);
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
          selectedValue={metricColumns[0]}
          onValueChange={(metric) => {
            setMetricColumns([metric, metricColumns[1]])
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
          selectedValue={metricColumnsType[1]}
          onValueChange={(metric) => {
            setMetricColumnsType([metricColumnsType[0], metric as AggregationType]);
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
          selectedValue={metricColumns[1]}
          onValueChange={(metric) => {
            setMetricColumns([metricColumns[0], metric])
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
        selectedValue={metricType}
        onValueChange={(metric) => {
          setMetricType(metric as AggregationType);
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
