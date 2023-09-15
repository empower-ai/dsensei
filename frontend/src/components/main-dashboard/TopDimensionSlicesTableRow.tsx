import {
  ChevronDoubleDownIcon,
  ChevronDoubleRightIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  Badge,
  BadgeDelta,
  Flex,
  TableCell,
  TableRow,
  Text,
} from "@tremor/react";
import { ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Md5 } from "ts-md5";
import { DimensionSliceInfo, DimensionSliceKey } from "../../common/types";
import {
  formatDimensionSliceKeyForRendering,
  formatMetricValue,
  formatNumber,
  renderDebugInfo,
  serializeDimensionSliceKey,
} from "../../common/utils";
import { RootState } from "../../store";
import {
  RowStatus,
  selectSliceForDetail,
  toggleRow,
} from "../../store/comparisonInsight";
import { TargetDirection } from "../../types/report-config";

type Props = {
  dimensionSlice: DimensionSliceInfo;
  rowStatus: RowStatus;
  parentDimensionSliceKey?: DimensionSliceKey;
  dimension?: string;
  overallChange: number;
  targetDirection: TargetDirection;
  aggregationMethod: string;
};

function getChangePercentage(num1: number, num2: number): ReactNode {
  const content =
    num1 === 0 ? "N/A" : `${formatNumber(((num2 - num1) / num1) * 100)}%`;
  return (
    <Badge size="xs" color="gray" className="ml-1">
      {content}
    </Badge>
  );
}

function getPerformanceComparedWithAvg(
  num1: number,
  num2: number,
  avgPerf: number,
  targetDirection: TargetDirection
): ReactNode {
  if (num1 === 0) {
    return "N/A";
  }

  const changePct = (num2 - num1) / num1;

  return getImpact(
    (changePct - avgPerf) * 100,
    (n) => `${formatNumber(n)}%`,
    targetDirection
  );
}

function getImpact(
  impact: number,
  formatter: (n: number) => string = function (n: number) {
    return formatNumber(n);
  },
  targetDirection: TargetDirection
): ReactNode {
  if (impact > 0) {
    return (
      <BadgeDelta
        deltaType="increase"
        isIncreasePositive={targetDirection === "increasing"}
      >
        +{formatter(impact)}
      </BadgeDelta>
    );
  } else if (impact === 0) {
    return <BadgeDelta deltaType="unchanged">{formatter(impact)}</BadgeDelta>;
  } else {
    return (
      <BadgeDelta
        deltaType="decrease"
        isIncreasePositive={targetDirection === "increasing"}
      >
        {formatter(impact)}
      </BadgeDelta>
    );
  }
}

export default function TopDimensionSlicesTableRow({
  rowStatus,
  dimensionSlice,
  parentDimensionSliceKey,
  overallChange,
  dimension,
  targetDirection,
  aggregationMethod,
}: Props) {
  const allDimensionSliceInfo = useSelector(
    (state: RootState) =>
      state.comparisonInsight.analyzingMetrics.dimensionSliceInfo
  );
  const dispatch = useDispatch();
  const serializedKey = serializeDimensionSliceKey(dimensionSlice.key);

  function renderSubSlices() {
    return Object.keys(rowStatus.children).map((subKey) => {
      return (
        <TopDimensionSlicesTableRow
          rowStatus={rowStatus.children[subKey]!}
          dimensionSlice={allDimensionSliceInfo[subKey]!}
          parentDimensionSliceKey={dimensionSlice.key}
          overallChange={overallChange}
          dimension={dimension}
          targetDirection={targetDirection}
          aggregationMethod={aggregationMethod}
        />
      );
    });
  }

  function toggleSliceDetailModal(key: DimensionSliceKey) {
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
                (rowStatus.key.length - 1) * 25 +
                (Object.keys(rowStatus.children).length > 0 ||
                !rowStatus.hasCalculatedChildren
                  ? 0
                  : 15)
              }px`,
            }}
          ></p>
          {(Object.keys(rowStatus.children).length > 0 ||
            !rowStatus.hasCalculatedChildren) && (
            <span
              className="w-4 cursor-pointer"
              onClick={() => {
                dispatch(
                  toggleRow({
                    keyPath: rowStatus.key,
                    dimension,
                  })
                );
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
            onClick={() => toggleSliceDetailModal(dimensionSlice.key)}
            className="w-6 cursor-pointer"
          >
            <DocumentMagnifyingGlassIcon />
          </span>
        </TableCell>
        <TableCell>
          <Flex className="justify-start">
            <Text>
              {formatMetricValue(
                dimensionSlice?.baselineValue.sliceValue,
                aggregationMethod
              )}{" "}
              vs{" "}
              {formatMetricValue(
                dimensionSlice?.comparisonValue.sliceValue,
                aggregationMethod
              )}
            </Text>
            {getChangePercentage(
              dimensionSlice?.baselineValue.sliceValue ?? 0,
              dimensionSlice?.comparisonValue.sliceValue ?? 0
            )}
          </Flex>
        </TableCell>
        <TableCell>
          {aggregationMethod === "RATIO"
            ? getImpact(
                dimensionSlice.absoluteContribution * 100,
                (n) => `${formatNumber(n)}%`,
                targetDirection
              )
            : getPerformanceComparedWithAvg(
                dimensionSlice?.baselineValue.sliceValue,
                dimensionSlice?.comparisonValue.sliceValue,
                overallChange,
                targetDirection
              )}
        </TableCell>
        <TableCell>
          <Text>
            {formatNumber(dimensionSlice?.baselineValue.sliceSize * 100)}% vs{" "}
            {formatNumber(dimensionSlice?.comparisonValue.sliceSize * 100)}%{" "}
            {getChangePercentage(
              dimensionSlice?.baselineValue.sliceSize ?? 0,
              dimensionSlice?.comparisonValue.sliceSize ?? 0
            )}
          </Text>
        </TableCell>
        <TableCell>
          {renderDebugInfo("P-Score", dimensionSlice.confidence)}
          {renderDebugInfo("Z-Score", dimensionSlice.changeDev)}
          {renderDebugInfo("Serialized Key", dimensionSlice.serializedKey)}
        </TableCell>
      </TableRow>
      {rowStatus.isExpanded && renderSubSlices()}
    </>
  );
}
