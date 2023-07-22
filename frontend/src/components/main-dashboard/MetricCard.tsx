import {
  Badge,
  BadgeDelta,
  Bold,
  Card,
  Flex,
  List,
  ListItem,
  Metric,
  Text,
  Title,
} from "@tremor/react";
import {
  formatDateString,
  formatMetricName,
  formatNumber,
} from "../../common/utils";
import { InsightMetric } from "../../common/types";
import { ReactNode } from "react";

interface Props {
  baseDateRange: [string, string];
  comparisonDateRange: [string, string];
  baseNumRows: number;
  comparisonNumRows: number;
  baseValue: number;
  comparisonValue: number;
  supportingMetrics: {
    name: string;
    baseValue: number;
    comparisonValue: number;
  }[];
  metricName: string;
}

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

export function MetricCard({
  baseDateRange,
  comparisonDateRange,
  baseNumRows,
  comparisonNumRows,
  baseValue,
  comparisonValue,
  supportingMetrics,
  metricName,
}: Props) {
  return (
    <>
      <Card className="border-t-4 border-t-orange-500 h-[100%]">
        <div className="h-[100%] grid">
          <div>
            <Title>Base Period</Title>
            <Text>
              {" "}
              {formatDateString(baseDateRange[0])} to{" "}
              {formatDateString(baseDateRange[1])}
            </Text>
            <Text>{formatNumber(baseNumRows)} total rows</Text>
          </div>
          <div className="self-center text-center justify-self-center content-center">
            <Flex className="self-center text-center justify-self-center content-center">
              <Text className="self-end mr-2">{metricName}:</Text>
              <Metric className="mr-2">{formatNumber(comparisonValue)}</Metric>
            </Flex>
          </div>
          <div className="self-end content-center">
            <Text>
              <Bold>Supporting Metrics</Bold>
            </Text>
            <List>
              {supportingMetrics.map((metric) => (
                <ListItem>
                  <Flex justifyContent="end" className="space-x-2.5">
                    <Text>{metric.name}:</Text>
                    <Title>{metric.baseValue}</Title>
                  </Flex>
                </ListItem>
              ))}
            </List>
          </div>
        </div>
      </Card>
      <Card className="border-t-4 border-t-sky-500 h-[100%]">
        <div className="h-[100%] grid">
          <div>
            <Title>Comparison Period</Title>
            <Text>
              {formatDateString(comparisonDateRange[0])} to{" "}
              {formatDateString(comparisonDateRange[1])}
            </Text>
            <Text>{formatNumber(comparisonNumRows)} total rows</Text>
          </div>
          <div className="self-center text-center justify-self-center content-center">
            <Flex className="self-center text-center justify-self-center content-center">
              <Text className="self-end mr-2">{metricName}:</Text>
              <Metric className="mr-2">{formatNumber(comparisonValue)}</Metric>
              {getChangePercentageBadge(baseValue, comparisonValue)}
            </Flex>
          </div>
          <div className="self-end content-center">
            <Text>
              <Bold>Supporting Metrics</Bold>
            </Text>
            <List>
              {supportingMetrics.map((metric) => (
                <ListItem>
                  <Flex justifyContent="end" className="space-x-2.5">
                    <Text>{metric.name}:</Text>
                    <Title>{metric.comparisonValue}</Title>
                    {getChangePercentageBadge(
                      metric.baseValue,
                      metric.comparisonValue
                    )}
                  </Flex>
                </ListItem>
              ))}
            </List>
          </div>
        </div>
      </Card>
    </>
  );
}
