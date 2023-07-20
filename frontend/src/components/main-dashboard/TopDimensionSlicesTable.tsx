import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
} from "@tremor/react";
import { InsightMetric } from "../../common/types";
import { serializeDimensionSliceKey } from "../../common/utils";
import TopDimensionSlicesTableRow from "./TopDimensionSlicesTableRow";
import { RowStatus } from "../../store/comparisonInsight";

type Props = {
  metric: InsightMetric;
  rowStatus: { [key: string]: RowStatus };
};

export default function TopDimensionSlicesTable({ metric, rowStatus }: Props) {
  return (
    <Card>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Dimension Slice</TableHeaderCell>
            <TableHeaderCell>Slice Size</TableHeaderCell>
            <TableHeaderCell>Slice Counts</TableHeaderCell>
            <TableHeaderCell>Impact</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metric.topDriverSliceKeys.map((key) => {
            const dimensionSlice = metric.dimensionSliceInfo[key]!;

            return (
              <TopDimensionSlicesTableRow
                rowStatus={rowStatus[key]!}
                dimensionSlice={dimensionSlice}
              />
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
