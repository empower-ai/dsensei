import React from "react";
import {
  Title,
  Card,
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
  if (data.length === 0) {
    return (
      <Card className="max-w-3xl mx-auto">
        <Title>Empty CSV file received</Title>
      </Card>
    );
  }

  const tableHeader = header.map((h) => (
    <TableHeaderCell key={h}>{h}</TableHeaderCell>
  ));
  const tableBody = data.slice(0, 10).map((item, row_index) => (
    <TableRow key={row_index}>
      {header.map((h, col_index) => (
        <TableCell key={row_index + "-" + col_index}>
          <Text>{item[h]}</Text>
        </TableCell>
      ))}
    </TableRow>
  ));

  return (
    <Card className="max-w-3xl mx-auto">
      <Title>{"Sample data from the uploaded CSV file"}</Title>
      <Table className="mt-2">
        <TableHead>
          <TableRow>{tableHeader}</TableRow>
        </TableHead>
        <TableBody>{tableBody}</TableBody>
      </Table>
    </Card>
  );
}

export default DataPreviewer;
