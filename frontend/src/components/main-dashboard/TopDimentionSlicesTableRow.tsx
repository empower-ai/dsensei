import {
  Badge,
  BadgeDelta,
  Flex,
  TableCell,
  TableRow,
  Text,
} from "@tremor/react";
import { DimensionSliceInfo } from "../../common/types";
import { ChevronDoubleRightIcon } from "@heroicons/react/outline";
import { serializeDimensionSliceKey } from "../../common/utils";
import { ReactNode } from "react";

type Props = {
  dimensionSlice: DimensionSliceInfo;
};

function getChangePercentage(num1: number, num2: number): ReactNode {
  const content =
    num1 === 0 ? "N/A" : `${(((num2 - num1) / num1) * 100).toFixed(2)}%`;
  return (
    <Badge size="xs" color="gray" className="ml-1">
      {content}
    </Badge>
  );
}

function getImpact(impact: number): ReactNode {
  if (impact > 0) {
    return <BadgeDelta deltaType="increase" />;
  } else if (impact === 0) {
    return <BadgeDelta deltaType="unchanged" />;
  } else {
    return <BadgeDelta deltaType="decrease" />;
  }
}

export default function TopDimensionSlicesTableRow({ dimensionSlice }: Props) {
  const serializedKey = serializeDimensionSliceKey(dimensionSlice.key);
  return (
    <TableRow key={serializedKey}>
      <TableCell className="flex items-center">
        <p className="w-3 cursor-pointer">
          <ChevronDoubleRightIcon />
        </p>
        <p className="px-2">{serializedKey}</p>
      </TableCell>
      <TableCell>
        <Text>
          {dimensionSlice?.baselineValue.sliceSize}% vs{" "}
          {dimensionSlice?.comparisonValue.sliceSize}%{" "}
          {getChangePercentage(
            dimensionSlice?.baselineValue.sliceSize ?? 0,
            dimensionSlice?.comparisonValue.sliceSize ?? 0
          )}
        </Text>
      </TableCell>
      <TableCell>
        <Flex className="justify-start">
          <Text>
            {dimensionSlice?.baselineValue.sliceCount} vs{" "}
            {dimensionSlice?.comparisonValue.sliceCount}
          </Text>
          {getChangePercentage(
            dimensionSlice?.baselineValue.sliceCount ?? 0,
            dimensionSlice?.comparisonValue.sliceCount ?? 0
          )}
        </Flex>
      </TableCell>
      <TableCell>
        <Flex className="justify-start items-center">
          {getImpact(dimensionSlice?.impact ?? 0)}
          <p className="px-2">{dimensionSlice?.impact}</p>
        </Flex>
      </TableCell>
    </TableRow>
  );
}
