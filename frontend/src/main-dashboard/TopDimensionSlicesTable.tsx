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
import { InsightMetric } from "../common/types";
import { serializeDimensionSliceKey } from "../common/utils";
import { ReactNode } from "react";

const data = [
  {
    name: "Viola Amherd",
    Role: "Federal Councillor",
    departement:
      "The Federal Department of Defence, Civil Protection and Sport (DDPS)",
    status: "active",
  },
  {
    name: "Simonetta Sommaruga",
    Role: "Federal Councillor",
    departement:
      "The Federal Department of the Environment, Transport, Energy and Communications (DETEC)",
    status: "active",
  },
  {
    name: "Alain Berset",
    Role: "Federal Councillor",
    departement: "The Federal Department of Home Affairs (FDHA)",
    status: "active",
  },
  {
    name: "Ignazio Cassis",
    Role: "Federal Councillor",
    departement: "The Federal Department of Foreign Affairs (FDFA)",
    status: "active",
  },
  {
    name: "Ueli Maurer",
    Role: "Federal Councillor",
    departement: "The Federal Department of Finance (FDF)",
    status: "active",
  },
  {
    name: "Guy Parmelin",
    Role: "Federal Councillor",
    departement:
      "The Federal Department of Economic Affairs, Education and Research (EAER)",
    status: "active",
  },
  {
    name: "Karin Keller-Sutter",
    Role: "Federal Councillor",
    departement: "The Federal Department of Justice and Police (FDJP)",
    status: "active",
  },
];

type Props = {
  metric: InsightMetric;
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
            const serializedKey = serializeDimensionSliceKey(key);
            const dimensionSlice = metric.dimensionSliceInfo.get(serializedKey);

            return [
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
              </TableRow>,
            ];
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
