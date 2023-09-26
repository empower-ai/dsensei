import {
  ChevronDoubleDownIcon,
  ChevronDoubleRightIcon,
  DocumentMagnifyingGlassIcon,
  FunnelIcon,
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
import { Tooltip } from "../../common/Tooltip";
import getSettings from "../../common/server-data/settings";
import {
  DimensionSliceInfo,
  DimensionSliceKey,
  InsightMetric,
} from "../../common/types";
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
  targetDirection: TargetDirection;
  aggregationMethod: string;
  onReRunOnSegment: (key: DimensionSliceKey) => void;
  metric: InsightMetric;
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

function getRelativePerformance(
  num1: number,
  num2: number,
  overallChange: number,
  targetDirection: TargetDirection
): ReactNode {
  if (num1 === 0) {
    return (
      <Badge size="xs" color="gray" className="ml-1">
        N/A
      </Badge>
    );
  }

  const change = (num2 - num1) / num1;
  const relativeChange = (change - overallChange) * 100.0;

  if (relativeChange > 0) {
    return (
      <BadgeDelta
        deltaType="increase"
        isIncreasePositive={targetDirection === "increasing"}
      >
        +{formatNumber(relativeChange)}%
      </BadgeDelta>
    );
  } else if (relativeChange === 0) {
    return (
      <BadgeDelta deltaType="unchanged">
        {formatNumber(relativeChange)}%
      </BadgeDelta>
    );
  }
  return (
    <BadgeDelta
      deltaType="decrease"
      isIncreasePositive={targetDirection === "increasing"}
    >
      {formatNumber(relativeChange)}%
    </BadgeDelta>
  );
}

function absoluteContribution(
  change: number,
  targetDirection: TargetDirection,
  changeFormatter: (n: number) => string = function (n: number) {
    return formatNumber(n);
  },
  relativeChange?: number
): ReactNode {
  let text = changeFormatter(change);
  if (relativeChange) {
    text = `${text}(${formatNumber(relativeChange * 100)}%)`;
  }
  if (change > 0) {
    return (
      <BadgeDelta
        deltaType="increase"
        isIncreasePositive={targetDirection === "increasing"}
      >
        +{text}
      </BadgeDelta>
    );
  } else if (change === 0) {
    return <BadgeDelta deltaType="unchanged">{text}</BadgeDelta>;
  } else {
    return (
      <BadgeDelta
        deltaType="decrease"
        isIncreasePositive={targetDirection === "increasing"}
      >
        {text}
      </BadgeDelta>
    );
  }
}

export default function TopDimensionSlicesTableRow({
  rowStatus,
  dimensionSlice,
  parentDimensionSliceKey,
  dimension,
  targetDirection,
  aggregationMethod,
  onReRunOnSegment,
  metric,
}: Props) {
  const allDimensionSliceInfo = useSelector(
    (state: RootState) =>
      state.comparisonInsight.analyzingMetrics.dimensionSliceInfo
  );
  const dispatch = useDispatch();
  const serializedKey = serializeDimensionSliceKey(dimensionSlice.key);

  function renderSubSlices() {
    return Object.keys(rowStatus.children).map((subKey) => {
      const dimensionSliceInfo = allDimensionSliceInfo[subKey]!;
      return (
        <TopDimensionSlicesTableRow
          rowStatus={rowStatus.children[subKey]!}
          dimensionSlice={dimensionSliceInfo}
          parentDimensionSliceKey={dimensionSlice.key}
          dimension={dimension}
          targetDirection={targetDirection}
          aggregationMethod={aggregationMethod}
          onReRunOnSegment={onReRunOnSegment}
          metric={metric}
          key={`${Md5.hashStr(serializedKey)}-${Md5.hashStr(
            dimensionSliceInfo.serializedKey
          )}`}
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
          <div
            style={{
              width: `${
                (rowStatus.key.length - 1) * 25 +
                (Object.keys(rowStatus.children).length > 0 ||
                !rowStatus.hasCalculatedChildren
                  ? 0
                  : 15)
              }px`,
            }}
          ></div>
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
          <div className="px-2 cursor flex items-center">
            {formatDimensionSliceKeyForRendering(
              dimensionSlice.key,
              parentDimensionSliceKey
            )}
          </div>
          <Tooltip text="Show segment detail">
            <button
              onClick={() => toggleSliceDetailModal(dimensionSlice.key)}
              className="w-6"
            >
              <DocumentMagnifyingGlassIcon />
            </button>
          </Tooltip>
          <Tooltip text="Re-run report within the segment">
            <button
              title="run report within the segment"
              onClick={() => onReRunOnSegment(dimensionSlice.key)}
              className="w-6 ml-1"
            >
              <FunnelIcon />
            </button>
          </Tooltip>
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
            ? absoluteContribution(
                dimensionSlice.absoluteContribution * 100,
                targetDirection,
                (n) => `${formatNumber(n)}%`
              )
            : absoluteContribution(
                dimensionSlice.impact,
                targetDirection,
                (n) => formatNumber(n)
              )}
        </TableCell>
        <TableCell>
          {getRelativePerformance(
            dimensionSlice?.baselineValue.sliceValue ?? 0,
            dimensionSlice?.comparisonValue.sliceValue ?? 0,
            (metric.comparisonValue - metric.baselineValue) /
              metric.baselineValue,
            targetDirection
          )}
        </TableCell>
        <TableCell>
          <Flex>
            <Text>
              {formatNumber(dimensionSlice?.baselineValue.sliceSize * 100)}% vs{" "}
              {formatNumber(dimensionSlice?.comparisonValue.sliceSize * 100)}%{" "}
            </Text>
            {getChangePercentage(
              dimensionSlice?.baselineValue.sliceSize ?? 0,
              dimensionSlice?.comparisonValue.sliceSize ?? 0
            )}
          </Flex>
        </TableCell>
        {getSettings().showDebugInfo && (
          <TableCell>
            {renderDebugInfo("P-Score", dimensionSlice.confidence)}
            {renderDebugInfo("Z-Score", dimensionSlice.changeDev)}
            {renderDebugInfo("Serialized Key", dimensionSlice.serializedKey)}
          </TableCell>
        )}
      </TableRow>
      {rowStatus.isExpanded && renderSubSlices()}
    </>
  );
}
