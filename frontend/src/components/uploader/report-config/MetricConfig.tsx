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
  const { getValidMetricColumns, selectedColumns, onSelectMetrics, onSelectMetricAggregationOption, targetDirection, setTargetDirection } = props;
  const [metricType, setMetricType] = useState<AggregationType>("sum");
  const [metricColumns, setMetricColumns] = useState<string[]>([]);

  useEffect(() => {
    if (metricColumns.length > 0) {
      onSelectMetricAggregationOption({
        columnNames: metricColumns,
        aggregationOption: metricType,
      } as MetricColumn, false);
    }
  }, [metricColumns, metricType, onSelectMetricAggregationOption]);

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
        selectedValue={
          Object.keys(selectedColumns).filter(
            (c) => selectedColumns[c]["type"] === "metric"
          ).length > 0
            ? Object.keys(selectedColumns).filter(
                (c) => selectedColumns[c]["type"] === "metric"
              )[0]
            : ""
        }
        onValueChange={(metric) => {
          setMetricColumns([metric]);
          onSelectMetrics([metric], "metric");
        }}
    />);
  };

  const complexMetrics = () => {
    return (
      <>

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
        labels={["Sum", "Count", "Count Distinct", "Ratio"]}
        values={["sum", "count", "count_distinct", "ratio"]}
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
