import {
  Badge,
  BadgeDelta,
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

function getChangePercentageBadge(
  num1: number,
  num2: number,
  additionalClasses: string = ""
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
}: Props) {
  return (
    <>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell></TableHeaderCell>
            <TableHeaderCell>Period</TableHeaderCell>
            <TableHeaderCell>Rows</TableHeaderCell>
            <TableHeaderCell>{metricName}</TableHeaderCell>
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
                  "mb-1"
                )}
              </Flex>
            </TableCell>
            <TableCell className="gap-3">
              <Flex
                className="self-center text-center content-center gap-2"
                justifyContent="start"
              >
                {formatNumber(comparisonValue)}
                {getChangePercentageBadge(baseValue, comparisonValue, "mb-1")}
              </Flex>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {/* <Card className="border-t-4 border-t-orange-500 h-[100%] overflow-overlay">
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
              <Metric className="mr-2">{formatNumber(baseValue)}</Metric>
            </Flex>
          </div>
          <div className="self-end content-center">
            <Text>
              <Bold>Additional Metrics</Bold>
            </Text>
            <List>
              {supportingMetrics.length > 0 ? (
                supportingMetrics.map((metric) => (
                  <ListItem>
                    <Flex justifyContent="end" className="space-x-2.5">
                      <Text>{metric.name}:</Text>
                      <Title>{metric.baseValue}</Title>
                    </Flex>
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  {" "}
                  <Flex justifyContent="end" className="space-x-2.5">
                    N/A
                  </Flex>
                </ListItem>
              )}
            </List>
          </div>
        </div>
      </Card>
      <Card className="border-t-4 border-t-sky-500 h-[100%] overflow-overlay">
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
              <Bold>Additional Metrics</Bold>
            </Text>
            <List>
              {supportingMetrics.length > 0 ? (
                supportingMetrics.map((metric) => (
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
                ))
              ) : (
                <ListItem>
                  {" "}
                  <Flex justifyContent="end" className="space-x-2.5">
                    N/A
                  </Flex>
                </ListItem>
              )}
            </List>
          </div>
        </div>
      </Card> */}
    </>
  );
}
