import React from "react";
import {
  Title,
  Button,
  Card,
  Flex,
  Text,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@tremor/react";

type DataPreviewerProps = {
  header: string[];
  data: { [k: string]: string }[];
};

function DataPreviewer({ header, data }: DataPreviewerProps) {
  const tableHeader = header.map((h) => (
    <TableHeaderCell key={h}>{h}</TableHeaderCell>
  ));
  const tableBody = data.slice(0, 10).map((item, row_index) => (
    <TableRow key={row_index}>
      {header.map((h, col_index) => (
        <TableCell>
          <Text key={row_index + "-" + col_index}>{item[h]}</Text>
        </TableCell>
      ))}
    </TableRow>
  ));

  return (
    <Card className="max-w-3xl mx-auto">
      <Table className="mt-5">
        <TableHead>
          <TableRow>{tableHeader}</TableRow>
        </TableHead>
        <TableBody>{tableBody}</TableBody>
      </Table>
    </Card>
  );
}

export default DataPreviewer;
