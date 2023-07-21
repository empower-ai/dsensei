import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
} from "@tremor/react";
import { InsightMetric } from "../../common/types";
import TopDimensionSlicesTableRow from "./TopDimensionSlicesTableRow";
import { RowStatus } from "../../store/comparisonInsight";
import { ReactNode } from "react";

type Props = {
  metric: InsightMetric;
  rowStatus: { [key: string]: RowStatus };
  dimension?: string;
  title?: ReactNode;
};

export default function TopDimensionSlicesTable({
  metric,
  rowStatus,
  dimension,
  title,
}: Props) {
  const overallChange =
    metric.baselineValue === 0
      ? 0
      : (metric.comparisonValue - metric.baselineValue) / metric.baselineValue;
  return (
    <Card>
      {title}
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
          {Object.keys(rowStatus).map((key) => {
            const dimensionSlice = metric.dimensionSliceInfo[key]!;

            return (
              <TopDimensionSlicesTableRow
                rowStatus={rowStatus[key]!}
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
