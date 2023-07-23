import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  Button,
  Card,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";

type DataPreviewerProps = {
  header: string[];
  data: { [k: string]: string }[];
  fileName?: string;
  onReset: () => void;
};

function DataPreviewer({
  header,
  data,
  fileName,
  onReset,
}: DataPreviewerProps) {
  if (data.length === 0) {
    return (
      <Card className="max-w-6xl mx-auto">
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
    <Card className="max-w-6xl mx-auto">
      <Flex>
        <Title>CSV Content Preview</Title>
        <Button icon={ArrowPathIcon} onClick={onReset}>
          Start Over
        </Button>
      </Flex>
      <Text>File: {fileName}</Text>
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
