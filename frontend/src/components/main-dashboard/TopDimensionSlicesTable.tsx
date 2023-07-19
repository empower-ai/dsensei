import { ChevronDoubleRightIcon } from "@heroicons/react/outline";
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  BadgeDelta,
  Badge,
  Flex,
} from "@tremor/react";
import { InsightMetric } from "../../common/types";
import { serializeDimensionSliceKey } from "../../common/utils";
import { ReactNode } from "react";
import TopDimensionSlicesTableRow from "./TopDimentionSlicesTableRow";

type Props = {
  metric: InsightMetric;
};

export default function TopDimensionSlicesTable({ metric }: Props) {
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
          {metric.topDriverSliceKeys.flatMap((key) => {
            const dimensionSlice = metric.dimensionSliceInfo.get(
              serializeDimensionSliceKey(key)
            )!;

            return [
              <TopDimensionSlicesTableRow dimensionSlice={dimensionSlice} />,
            ];
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
