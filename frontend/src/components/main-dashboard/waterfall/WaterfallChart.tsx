import { Divider, Flex } from "@tremor/react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DimensionSliceKey } from "../../../common/types";
import {
  formatNumber,
  serializeDimensionSliceKey,
} from "../../../common/utils";
interface Props {
  waterfallRows: {
    key: DimensionSliceKey;
    change: number;
    changeWithNoOverlap: number;
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
        <text
          x={0}
          y={0}
          dy={18 * (idx + 1)}
          textAnchor="middle"
          fill="#666"
          key={row}
        >
          {idx > 4 ? "..." : row}
        </text>
      ))}
    </g>
  );
};

function shortenNumber(value: number) {
  const number = Math.abs(value);
  if (number > 1000000000) {
    return formatNumber(value / 1000000000) + "B";
  } else if (number > 1000000) {
    return formatNumber(value / 1000000) + "M";
  } else if (number > 1000) {
    return formatNumber(value / 1000) + "K";
  } else {
    return formatNumber(value);
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload.find((p: any) => p.dataKey === "overlap").payload;
    const change = data.change + (data.flipped ? -data.overlap : data.overlap);
    return (
      <Flex
        className="border bg-white p-2"
        flexDirection="col"
        justifyContent="start"
        alignItems="start"
      >
        <Flex className="gap-2" justifyContent="start">
          <Flex className="gap-2">
            {(label as string).split(" AND ").flatMap((component, idx) => {
              const result = [
                <span
                  className="text-black border-2 bg-gray-100 p-1"
                  key={`${label}-${component}-value`}
                >
                  {component}
                </span>,
              ];

              if (idx < (label as string).split(" AND ").length - 1) {
                result.push(<span key={`${label}-${component}-and`}>AND</span>);
              }
              return result;
            })}
          </Flex>
        </Flex>
        <Divider className="my-3" />
        <p>Change: {formatNumber(change)}</p>
        <p>Change with overlap excluded: {formatNumber(data.change)}</p>
      </Flex>
    );
  }

  return null;
};

export default function WaterfallChart({ waterfallRows, totalImpact }: Props) {
  const [width, setWidth] = useState<number>(0);
  let pv = 0;
  const data = Object.values(waterfallRows)
    .slice(0, 8)
    .map((row, idx) => {
      let overlap = row.change - row.changeWithNoOverlap;
      let resultPv = pv - overlap;
      let flipped = false;
      if (
        (row.changeWithNoOverlap > 0 && overlap < 0) ||
        (row.changeWithNoOverlap < 0 && overlap > 0)
      ) {
        resultPv = pv + overlap;
        overlap = -overlap;
        flipped = true;
      }
      const result = {
        name: serializeDimensionSliceKey(row.key, ": ", " AND "),
        change: row.changeWithNoOverlap,
        pv: resultPv,
        pvForReferenceLine: pv,
        overlap,
        flipped,
      };
      pv = pv + row.changeWithNoOverlap;
      return result;
    });
  data.push({
    name: "All Others",
    change: totalImpact - pv,
    pv,
    pvForReferenceLine: pv,
    overlap: 0,
    flipped: false,
  });
  data.push({
    name: "Total",
    change: totalImpact,
    pv: 0,
    pvForReferenceLine: 0,
    overlap: 0,
    flipped: false,
  });

  return (
    <ResponsiveContainer
      width="100%"
      height={450}
      onResize={(w) => setWidth(w)}
    >
      <BarChart
        width={1650}
        height={450}
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
          height={120}
          interval={
            width === 0 ? 0 : Math.floor(waterfallRows.length / (width / 200))
          }
          type="category"
        />
        <YAxis
          label={{ value: "Contribution", angle: -90, position: "insideLeft" }}
          padding={{
            bottom: 5,
          }}
          width={100}
          tickFormatter={shortenNumber}
        />
        <Tooltip content={<CustomTooltip />} />
        {data.map((row, idx) => {
          if (idx === data.length - 1) {
            return null;
          }
          return (
            <ReferenceLine
              segment={[
                {
                  x: data[idx].name,
                  y: data[idx].pvForReferenceLine + data[idx].change,
                },
                {
                  x: data[idx + 1].name,
                  y: data[idx].pvForReferenceLine + data[idx].change,
                },
              ]}
              stroke="gray"
              strokeDasharray="2 2"
              key={data[idx].name}
            />
          );
        })}
        <Bar dataKey="pv" stackId="a" fill="transparent" />
        <Bar dataKey="overlap" stackId="a">
          {data.map((item, index) => {
            if (
              (item.overlap < 0 && !item.flipped) ||
              (item.overlap > 0 && item.flipped)
            ) {
              return <Cell key={index} fill="#fec9c9" />;
            } else if (
              (item.overlap > 0 && !item.flipped) ||
              (item.overlap < 0 && item.flipped)
            ) {
              return <Cell key={index} fill="#abf7b1" />;
            }

            return <Cell key={index} fill="transparent" />;
          })}
        </Bar>
        <Bar dataKey="change" stackId="a" isAnimationActive={false}>
          <LabelList
            dataKey="change"
            position="top"
            formatter={(num: number) => {
              const prefix = num > 0 ? "+ " : "";
              const result = prefix + formatNumber(num);
              if (result.length * 8 > width / (waterfallRows.length + 2)) {
                return prefix + shortenNumber(num);
              }
              return result;
            }}
          />
          {data.map((item, index) => {
            if (item.name === "Total") {
              return <Cell key={index} fill="#3b82f6" />;
            }
            if (item.change < 0) {
              return <Cell key={index} fill="#ef4444" />;
            } else if (item.change > 0) {
              return <Cell key={index} fill="#22c55e" />;
            } else {
              return <Cell key={index} fill="#808080" />;
            }
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
