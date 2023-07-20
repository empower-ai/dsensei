import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
} from "@tremor/react";
import { DimensionSliceInfo, InsightMetric } from "../../common/types";
import { serializeDimensionSliceKey } from "../../common/utils";
import TopDimensionSlicesTableRow from "./TopDimensionSlicesTableRow";
import { RowStatus } from "../../store/comparisonInsight";

type Props = {
  metric: InsightMetric;
  rowStatus: { [key: string]: RowStatus };
};

export default function TopDimensionSlicesTable({ metric, rowStatus }: Props) {
  const overallChange =
    metric.baselineValue === 0
      ? 0
      : (metric.comparisonValue - metric.baselineValue) / metric.baselineValue;
  return (
    <Card>
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
          {metric.topDriverSliceKeys.map((key) => {
            const dimensionSlice = metric.dimensionSliceInfo[key]!;

            return (
              <TopDimensionSlicesTableRow
                rowStatus={rowStatus[key]!}
                dimensionSlice={dimensionSlice}
                overallChange={overallChange}
              />
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
