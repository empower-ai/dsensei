import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  Text,
  Flex,
} from "@tremor/react";
import { InsightMetric } from "../../common/types";
import TopDimensionSlicesTableRow from "./TopDimensionSlicesTableRow";
import { RowStatus } from "../../store/comparisonInsight";
import { ReactNode, useState } from "react";

type Props = {
  metric: InsightMetric;
  rowStatusMap: { [key: string]: RowStatus };
  maxDefaultRows?: number;
  dimension?: string;
  title?: ReactNode;
};

export default function TopDimensionSlicesTable({
  metric,
  rowStatusMap,
  maxDefaultRows,
  dimension,
  title,
}: Props) {
  const overallChange =
    metric.baselineValue === 0
      ? 0
      : (metric.comparisonValue - metric.baselineValue) / metric.baselineValue;

  const [isCollapsed, setIsCollapse] = useState(true);
  const rowStatusKeys = Object.keys(rowStatusMap);

  let rowStatusKeysToRender = rowStatusKeys;
  const haveRowsToExpand =
    maxDefaultRows &&
    maxDefaultRows > 0 &&
    maxDefaultRows < rowStatusKeys.length;

  if (haveRowsToExpand) {
    if (isCollapsed) {
      rowStatusKeysToRender = rowStatusKeys.slice(0, maxDefaultRows);
    } else {
      rowStatusKeysToRender = rowStatusKeys;
    }
  }

  function renderExpandControl() {
    if (!haveRowsToExpand) {
      return null;
    }

    return isCollapsed ? (
      <button
        onClick={() => setIsCollapse(false)}
        className="btn-link text-sky-800"
      >
        Show All
      </button>
    ) : (
      <button
        onClick={() => setIsCollapse(true)}
        className="btn-link text-sky-800"
      >
        Collapse
      </button>
    );
  }

  return (
    <Card>
      {title}
      <Flex justifyContent="start" className="gap-2">
        <Text>
          Showing {rowStatusKeysToRender.length} of {rowStatusKeys.length} rows.
        </Text>
        {renderExpandControl()}
      </Flex>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Dimension Slice</TableHeaderCell>
            <TableHeaderCell>Slice Size</TableHeaderCell>
            <TableHeaderCell>Slice Value</TableHeaderCell>
            <TableHeaderCell>Impact</TableHeaderCell>
            <TableHeaderCell>Performance Compared with Average</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rowStatusKeysToRender.map((key) => {
            const dimensionSlice = metric.dimensionSliceInfo[key]!;

            return (
              <TopDimensionSlicesTableRow
                rowStatus={rowStatusMap[key]!}
                dimensionSlice={dimensionSlice}
                overallChange={overallChange}
                dimension={dimension}
              />
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
