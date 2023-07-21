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
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { TooltipIcon } from "../../common/TooltipIcon";

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
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Dimension Slice{" "}
                <TooltipIcon text="asdf a asdf sdf sdf sdf asdf;asd fjsdf asdf; sdf sdf asd;f as;dfjsd;fjsdio fsdoif jsdjfnzvn ;sd spdf " />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Slice Size
                <TooltipIcon text="foo" />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Slice Value
                <TooltipIcon text="foo" />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Impact
                <TooltipIcon text="foo" />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Performance Compared with Average
                <TooltipIcon text="foo" />
              </Flex>
            </TableHeaderCell>
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
