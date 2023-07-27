import { Flex } from "@tremor/react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DimensionSliceKey } from "../../../../common/types";
import {
  deSerializeDimensionSliceKey,
  formatDimensionSliceKeyForRendering,
  formatNumber,
  serializeDimensionSliceKey,
} from "../../../../common/utils";

interface Props {
  waterfallRows: {
    key: DimensionSliceKey;
    impact: number;
  }[];
  totalImpact: number;
}

const CustomizedGroupTick = (props: any) => {
  const { x, y, payload } = props;

  const numberOfCharsPerRow = 15;
  const strParts = (payload.value as string).split(" ");

  const rows: string[] = [];
  let row = "";
  strParts.forEach((strPart, idx) => {
    if (row.length + strPart.length < numberOfCharsPerRow) {
      row = `${row} ${strPart}`;
    } else {
      rows.push(row);
      if (strPart.length < numberOfCharsPerRow) {
        row = strPart;
      } else {
        if (strPart.at(strPart.length - 1) === ":") {
          row = `${strPart.substring(0, numberOfCharsPerRow - 4)}...:`;
        } else {
          row = row = strPart.substring(0, numberOfCharsPerRow - 3);
        }
      }
    }

    if (row.length > numberOfCharsPerRow || idx === strParts.length - 1) {
      rows.push(row);
      row = "";
    }
  });

  return (
    <g transform={`translate(${x},${y})`}>
      {rows.map((row, idx) => (
        <text x={0} y={0} dy={18 * (idx + 1)} textAnchor="middle" fill="#666">
          {row}
        </text>
      ))}
    </g>
  );
};

export default function WaterfallChart({ waterfallRows, totalImpact }: Props) {
  let pv = 0;

  const data = Object.values(waterfallRows)
    .slice(0, 8)
    .map((row) => {
      const result = {
        name: serializeDimensionSliceKey(row.key, ": ", " AND "),
        impact: row.impact,
        pv,
      };
      pv += row.impact;
      return result;
    });
  data.push({
    name: "All Others",
    impact: totalImpact - pv,
    pv,
  });
  data.push({
    name: "Total",
    impact: totalImpact,
    pv: 0,
  });
  return (
    <BarChart
      width={1650}
      height={400}
      data={data}
      margin={{
        top: 20,
        right: 30,
        left: 20,
        bottom: 5,
      }}
    >
      <XAxis
        dataKey="name"
        tick={CustomizedGroupTick}
        height={100}
        interval={0}
        type="category"
      />
      <YAxis label={{ value: "Impact", angle: -90, position: "insideLeft" }} />
      <Tooltip
        formatter={formatNumber}
        labelFormatter={(label) => {
          if (label === "Total" || label === "All Others") {
            return <div>{label}</div>;
          }

          return (
            <Flex className="gap-2 flex-col items-start">
              {formatDimensionSliceKeyForRendering(
                deSerializeDimensionSliceKey(label)
              )}
            </Flex>
          );
        }}
      />
      {data.map((row, idx) => {
        if (idx === data.length - 1) {
          return null;
        }
        return (
          <ReferenceLine
            segment={[
              {
                x: data[idx].name,
                y: data[idx].pv + data[idx].impact,
              },
              {
                x: data[idx + 1].name,
                y: data[idx].pv + data[idx].impact,
              },
            ]}
            stroke="gray"
            strokeDasharray="2 2"
          />
        );
      })}
      <Bar dataKey="pv" stackId="a" fill="transparent" />
      <Bar dataKey="impact" stackId="a">
        <LabelList dataKey="impact" position="top" formatter={formatNumber} />
        {data.map((item, index) => {
          if (item.impact < 0) {
            return <Cell key={index} fill="#ef4444" />;
          }
          if (item.name === "Total") {
            return <Cell key={index} fill="#3b82f6" />;
          }
          return <Cell key={index} fill="#22c55e" />;
        })}
      </Bar>
    </BarChart>
  );
}
