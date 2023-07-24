import { Flex } from "@tremor/react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
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

export default function WaterfallChart({ waterfallRows, totalImpact }: Props) {
  let pv = 0;

  const data = Object.values(waterfallRows)
    .slice(0, 8)
    .map((row) => {
      const result = {
        name: serializeDimensionSliceKey(row.key),
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
        includeHidden={true}
        allowDataOverflow={true}
        tickLine={false}
        tickFormatter={(v, i) => (v === "Total" || v === "All Others" ? v : "")}
      />
      <YAxis />
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
