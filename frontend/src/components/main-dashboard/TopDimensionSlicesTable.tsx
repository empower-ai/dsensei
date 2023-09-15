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
import getSettings from "../../common/server-data/settings";
import { InsightMetric } from "../../common/types";
import { RootState } from "../../store";
import {
  RowStatus,
  setMode,
  setSensitivity,
  toggleGroupRows,
} from "../../store/comparisonInsight";
import { TargetDirection } from "../../types/report-config";
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
  targetDirection: TargetDirection;
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
  targetDirection,
}: Props) {
  const dispatch = useDispatch();
  const [isCollapsed, setIsCollapse] = useState(true);

  const mode = useSelector((state: RootState) => state.comparisonInsight.mode);
  const sensitivity = useSelector(
    (state: RootState) => state.comparisonInsight.sensitivity
  );
  const setTopDriverMode = (mode: "impact" | "outlier") => {
    dispatch(setMode(mode));
  };
  const setSensitvity = (sensitivity: "low" | "medium" | "high") => {
    dispatch(setSensitivity(sensitivity));
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
              <Text>Mode:</Text>
              <Select
                value={mode}
                onValueChange={(e) => {
                  setTopDriverMode(e as any);
                }}
              >
                <SelectItem value="impact">All Top Segments</SelectItem>
                <SelectItem value="outlier">Noticeable Only</SelectItem>
              </Select>
              <TooltipIcon
                text="All Top Segments: Show all segments with the top change on the metric.
               Noticeable Only: Show noticeable segments recommended by the algorithm."
              />
            </>
          )}
          {mode === "outlier" && (
            <>
              <Text>Sensitivity:</Text>
              <Select
                value={sensitivity}
                onValueChange={(e) => {
                  setSensitvity(e as any);
                }}
              >
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </Select>
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
                {metric.name}
                <TooltipIcon text="Metric value aggregated to the segment." />
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                {metric["aggregationMethod"] === "RATIO"
                  ? `Absolute Contribution`
                  : "Relative Performance"}
                {metric["aggregationMethod"] === "RATIO" ? (
                  <TooltipIcon text="Absolute contribution of the segment to the overall metric movement." />
                ) : (
                  <TooltipIcon text="Performance of the segment compared with average performance, calculated by: change_pct_of_segment - avg_change_pct" />
                )}
              </Flex>
            </TableHeaderCell>
            <TableHeaderCell>
              <Flex justifyContent="start" className="gap-2">
                Segment Size
                <TooltipIcon text="Size of the segment, calculated by: total_rows_in_segment / total_rows" />
              </Flex>
            </TableHeaderCell>
            {getSettings().showDebugInfo && (
              <TableHeaderCell>
                <Flex justifyContent="start" className="gap-2">
                  Debug Info
                </Flex>
              </TableHeaderCell>
            )}
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
                targetDirection={targetDirection}
                aggregationMethod={metric.aggregationMethod}
              />
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
