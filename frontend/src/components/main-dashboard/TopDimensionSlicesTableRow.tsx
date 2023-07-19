import {
  Badge,
  BadgeDelta,
  Flex,
  TableCell,
  TableRow,
  Text,
} from "@tremor/react";
import { DimensionSliceInfo } from "../../common/types";
import {
  ChevronDoubleDownIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/outline";
import { serializeDimensionSliceKey } from "../../common/utils";
import { ReactNode } from "react";
import { RowStatus, toggleRow } from "../../store/comparisonInsight";
import { Md5 } from "ts-md5";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";

type Props = {
  dimensionSlice: DimensionSliceInfo;
  rowStatus: RowStatus;
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
    return <BadgeDelta deltaType="increase">{impact}</BadgeDelta>;
  } else if (impact === 0) {
    return <BadgeDelta deltaType="unchanged">{impact}</BadgeDelta>;
  } else {
    return <BadgeDelta deltaType="decrease">{impact}</BadgeDelta>;
  }
}

export default function TopDimensionSlicesTableRow({
  rowStatus,
  dimensionSlice,
}: Props) {
  const allDimensionSliceInfo = useSelector(
    (state: RootState) =>
      state.comparisonInsight.analyzingMetrics.dimensionSliceInfo
  );
  const dispatch = useDispatch();
  const serializedKey = rowStatus.key
    .map((keyComponent) => serializeDimensionSliceKey(keyComponent))
    .join(" AND ");

  function renderSubSlices() {
    return dimensionSlice.topDrivingDimensionSliceKeys.map((subKey) => {
      const serializedSubKey = serializeDimensionSliceKey(subKey);
      return (
        <TopDimensionSlicesTableRow
          rowStatus={rowStatus.children[serializedSubKey]!}
          dimensionSlice={allDimensionSliceInfo.get(serializedSubKey)!}
        />
      );
    });
  }

  return (
    <>
      <TableRow key={Md5.hashStr(serializedKey)}>
        <TableCell className="flex items-center">
          <p
            style={{
              width: `${
                (rowStatus.key.length - 1) * 12 +
                (dimensionSlice.topDrivingDimensionSliceKeys.length > 0
                  ? 0
                  : 12)
              }px`,
            }}
          ></p>
          {dimensionSlice.topDrivingDimensionSliceKeys.length > 0 && (
            <p
              className="w-3 cursor-pointer"
              onClick={() => {
                dispatch(toggleRow(rowStatus.key));
              }}
            >
              {rowStatus.isExpanded ? (
                <ChevronDoubleDownIcon />
              ) : (
                <ChevronDoubleRightIcon />
              )}
            </p>
          )}
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
            <Text className="mr-3">
              {dimensionSlice.baselineValue.sliceValue} vs{" "}
              {dimensionSlice.comparisonValue.sliceCount}
            </Text>
            {getImpact(dimensionSlice?.impact ?? 0)}
          </Flex>
        </TableCell>
      </TableRow>
      {rowStatus.isExpanded && renderSubSlices()}
    </>
  );
}
