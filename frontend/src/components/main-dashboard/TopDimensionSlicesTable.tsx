import {
  Card,
  Flex,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from "@tremor/react";
import { ReactNode, useState } from "react";
import { CSVLink } from "react-csv";
import { useDispatch, useSelector } from "react-redux";
import { TooltipIcon } from "../../common/TooltipIcon";
import { InsightMetric } from "../../common/types";
import { RootState } from "../../store";
import {
  RowStatus,
  setMode,
  toggleGroupRows,
} from "../../store/comparisonInsight";
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
  showDimensionSelector: boolean;
  showCalculationMode: boolean;
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
  showCalculationMode,
}: Props) {
  const dispatch = useDispatch();
  const [isCollapsed, setIsCollapse] = useState(true);

  const mode = useSelector((state: RootState) => state.comparisonInsight.mode);
  const setTopDriverMode = (mode: "impact" | "outlier") => {
    dispatch(setMode(mode));
  };

  const overallChange =
    metric.baselineValue === 0
      ? 0
      : (metric.comparisonValue - metric.baselineValue) / metric.baselineValue;

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
        <Flex justifyContent="start" className="gap-2 w-auto">
          {showCalculationMode && (
            <>
              <Text>Calculation Mode:</Text>
              <Select
                className="w-[150px] min-w-[160px]"
                value={mode}
                onValueChange={(e) => {
                  setTopDriverMode(e as any);
                }}
              >
                <SelectItem value="impact">Impact Mode</SelectItem>
                <SelectItem value="outlier">Outlier Mode</SelectItem>
              </Select>
              <TooltipIcon
                text="Impact Mode: Show segments with the highest impact on the metric.
              Outlier Mode: Show segments with the highest outlier score."
              />
            </>
          )}
          {enableGroupToggle && (
            <>
              <Text>|</Text>
              <Text>Group Segments:</Text>
              <label className="label cursor-pointer content-center">
                <input
                  type="checkbox"
                  className="toggle"
                  onChange={() => {
                    dispatch(toggleGroupRows());
                  }}
                  checked={groupRows}
                />
                <TooltipIcon text="Group related segments together." />
              </label>
            </>
          )}
        </Flex>
        <Flex className="w-auto gap-2" justifyContent="end">
          <Text>
            Showing {rowStatusKeysToRender.length} of {rowStatusKeys.length}{" "}
            segments.
          </Text>
          {renderExpandControl()}
          <Text>|</Text>
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
                Metrics Value
                <TooltipIcon text="Metric value aggregated to the segment." />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Metrics Change
                <TooltipIcon text="Impact of the segment to the overall metric movement, calculated by: segment_value_of_comparison_period - segment_value_of_base_period." />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Relative Performance
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
