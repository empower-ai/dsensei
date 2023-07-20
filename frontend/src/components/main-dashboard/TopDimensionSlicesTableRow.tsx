import {
  Badge,
  BadgeDelta,
  Flex,
  TableCell,
  TableRow,
  Text,
} from "@tremor/react";
import { DimensionSliceInfo, DimensionSliceKey } from "../../common/types";
import {
  ChevronDoubleDownIcon,
  ChevronDoubleRightIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  formatDimensionSliceKeyForRendering,
  serializeDimensionSliceKey,
} from "../../common/utils";
import { ReactNode } from "react";
import {
  RowStatus,
  selectSliceForDetail,
  toggleRow,
} from "../../store/comparisonInsight";
import { Md5 } from "ts-md5";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";

type Props = {
  dimensionSlice: DimensionSliceInfo;
  rowStatus: RowStatus;
  parentDimensionSliceKey?: DimensionSliceKey;
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
  parentDimensionSliceKey,
}: Props) {
  const allDimensionSliceInfo = useSelector(
    (state: RootState) =>
      state.comparisonInsight.analyzingMetrics.dimensionSliceInfo
  );
  const dispatch = useDispatch();
  const serializedKey = serializeDimensionSliceKey(dimensionSlice.key);

  function renderSubSlices() {
    return dimensionSlice.topDrivingDimensionSliceKeys.map((subKey) => {
      // const serializedSubKey = serializeDimensionSliceKey(subKey);

      return (
        <TopDimensionSlicesTableRow
          rowStatus={rowStatus.children[subKey]!}
          dimensionSlice={allDimensionSliceInfo[subKey]!}
          parentDimensionSliceKey={dimensionSlice.key}
        />
      );
    });
  }

  function toggleSliceDetailModal(key: string) {
    dispatch(selectSliceForDetail(key));
    (window as any).slice_detail.showModal();
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
            <span
              className="w-4 cursor-pointer"
              onClick={() => {
                dispatch(toggleRow(rowStatus.key));
              }}
            >
              {rowStatus.isExpanded ? (
                <ChevronDoubleDownIcon />
              ) : (
                <ChevronDoubleRightIcon />
              )}
            </span>
          )}
          <p className="px-2 cursor flex items-center">
            {formatDimensionSliceKeyForRendering(
              dimensionSlice.key,
              parentDimensionSliceKey
            )}
          </p>
          <span
            onClick={() => toggleSliceDetailModal(dimensionSlice.serializedKey)}
            className="w-6 cursor-pointer"
          >
            <DocumentMagnifyingGlassIcon />
          </span>
        </TableCell>
        <TableCell>
          <Text>
            {(dimensionSlice?.baselineValue.sliceSize * 100).toFixed(2)}% vs{" "}
            {(dimensionSlice?.comparisonValue.sliceSize * 100).toFixed(2)}%{" "}
            {getChangePercentage(
              dimensionSlice?.baselineValue.sliceSize ?? 0,
              dimensionSlice?.comparisonValue.sliceSize ?? 0
            )}
          </Text>
        </TableCell>
        <TableCell>
          <Flex className="justify-start">
            <Text>
              {dimensionSlice?.baselineValue.sliceValue.toFixed(2)} vs{" "}
              {dimensionSlice?.comparisonValue.sliceValue.toFixed(2)}
            </Text>
            {getChangePercentage(
              dimensionSlice?.baselineValue.sliceValue ?? 0,
              dimensionSlice?.comparisonValue.sliceValue ?? 0
            )}
          </Flex>
        </TableCell>
        <TableCell>
          <Flex className="justify-start items-center">
            <Text className="mr-3">
              {dimensionSlice.baselineValue.sliceValue} vs{" "}
              {dimensionSlice.comparisonValue.sliceValue}
            </Text>
            {getImpact(dimensionSlice?.impact ?? 0)}
          </Flex>
        </TableCell>
      </TableRow>
      {rowStatus.isExpanded && renderSubSlices()}
    </>
  );
}
