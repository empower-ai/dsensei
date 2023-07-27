import {
  Card,
  Flex,
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";
import { ReactNode, useState } from "react";
import { CSVLink } from "react-csv";
import { useDispatch } from "react-redux";
import { TooltipIcon } from "../../common/TooltipIcon";
import { InsightMetric } from "../../common/types";
import { RowStatus, toggleGroupRows } from "../../store/comparisonInsight";
import TopDimensionSlicesTableRow from "./TopDimensionSlicesTableRow";

type Props = {
  metric: InsightMetric;
  rowStatusMap: { [key: string]: RowStatus };
  rowCSV: (number | string)[][];
  maxDefaultRows?: number;
  dimension?: string;
  title?: ReactNode;
  groupRows?: boolean;
  enableGroupToggle?: boolean;
};

export default function TopDimensionSlicesTable({
  metric,
  rowStatusMap,
  rowCSV,
  maxDefaultRows,
  dimension,
  title,
  groupRows,
  enableGroupToggle,
}: Props) {
  const dispatch = useDispatch();
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
    <Card className="overflow-overlay">
      {title}
      <Flex justifyContent="between">
        <Flex justifyContent="start" className="gap-2">
          <Text>
            Showing {rowStatusKeysToRender.length} of {rowStatusKeys.length}{" "}
            segments.
          </Text>
          {renderExpandControl()}
          {enableGroupToggle && (
            <>
              <Title>|</Title>
              <label className="label cursor-pointer content-center">
                <input
                  type="checkbox"
                  className="toggle"
                  onChange={() => {
                    dispatch(toggleGroupRows());
                  }}
                  checked={groupRows}
                />
                <Text className="pl-2">Group Related Segments Together</Text>
              </label>
            </>
          )}
        </Flex>
        <Flex justifyContent="end">
          <CSVLink
            data={rowCSV}
            filename={"output.csv"}
            className="btn-link text-sky-800"
            target="_blank"
          >
            Export as CSV
          </CSVLink>
        </Flex>
      </Flex>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Segment{" "}
                <TooltipIcon text="Segment is a defined by a set of dimension and value pairs." />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Segment Size
                <TooltipIcon text="Size of the segment, calculated by: total_rows_in_segment / total_rows" />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Segment Value
                <TooltipIcon text="Metric value aggregated to the segment." />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Impact
                <TooltipIcon text="Impact of the segment to the overall metric movement, calculated by: segment_value_of_comparison_period - segment_value_of_base_period." />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Performance Compared with Average
                <TooltipIcon text="Performance of the segment compared with average performance, calculated by: change_pct_of_segment - avg_change_pct" />
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
