import {
  Badge,
  BadgeDelta,
  Card,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from "@tremor/react";
import { ReactNode } from "react";
import { formatDateString, formatNumber } from "../../common/utils";
import { TargetDirection } from "../../types/report-config";

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
  targetDirection: TargetDirection;
}

function getChangePercentageBadge(
  num1: number,
  num2: number,
  additionalClasses: string = "",
  targetDirection: TargetDirection
): ReactNode {
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
    <BadgeDelta
      size="xs"
      deltaType={deltaType}
      isIncreasePositive={targetDirection === "increasing"}
      className={`align-middle ${additionalClasses}`}
    >
      {content}
    </BadgeDelta>
  );
}

export function MetricOverviewTable({
  baseDateRange,
  comparisonDateRange,
  baseNumRows,
  comparisonNumRows,
  baseValue,
  comparisonValue,
  supportingMetrics,
  metricName,
  targetDirection,
}: Props) {
  return (
    <Card className="overflow-overlay">
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell></TableHeaderCell>
            <TableHeaderCell>Period</TableHeaderCell>
            <TableHeaderCell>Rows</TableHeaderCell>
            <TableHeaderCell>{metricName}</TableHeaderCell>
            {supportingMetrics.map((metric) => (
              <TableHeaderCell>{metric.name}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <Text color="orange">Base</Text>
            </TableCell>
            <TableCell>
              {formatDateString(baseDateRange[0])} to{" "}
              {formatDateString(baseDateRange[1])}
            </TableCell>
            <TableCell>{formatNumber(baseNumRows)}</TableCell>
            <TableCell>{formatNumber(baseValue)}</TableCell>
            {supportingMetrics.map((metric) => (
              <TableCell>{formatNumber(metric.baseValue)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell>
              <Text color="sky">Comparison</Text>
            </TableCell>
            <TableCell>
              {formatDateString(comparisonDateRange[0])} to{" "}
              {formatDateString(comparisonDateRange[1])}
            </TableCell>
            <TableCell>
              <Flex
                className="self-center text-center content-center gap-2"
                justifyContent="start"
              >
                {formatNumber(comparisonNumRows)}
                {getChangePercentageBadge(
                  baseNumRows,
                  comparisonNumRows,
                  "mb-1",
                  targetDirection
                )}
              </Flex>
            </TableCell>
            <TableCell className="gap-3">
              <Flex
                className="self-center text-center content-center gap-2"
                justifyContent="start"
              >
                {formatNumber(comparisonValue)}
                {getChangePercentageBadge(
                  baseValue,
                  comparisonValue,
                  "mb-1",
                  targetDirection
                )}
              </Flex>
            </TableCell>
            {supportingMetrics.map((metric) => (
              <TableCell className="gap-3">
                <Flex
                  className="self-center text-center content-center gap-2"
                  justifyContent="start"
                >
                  {formatNumber(metric.comparisonValue)}
                  {getChangePercentageBadge(
                    metric.baseValue,
                    metric.comparisonValue,
                    "mb-1",
                    targetDirection
                  )}
                </Flex>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
