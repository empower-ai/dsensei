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
  header: {
    name: string;
    type: string;
  }[];
  previewData: { [k: string]: string }[];
  fileName?: string;
  onReset: () => void;
};

function DataPreviewer({
  header,
  previewData,
  fileName,
  onReset,
}: DataPreviewerProps) {
  if (previewData.length === 0) {
    return (
      <Card className="max-w-6xl mx-auto">
        <Title>Empty CSV file received</Title>
      </Card>
    );
  }

  const tableHeader = header.map((h) => (
    <TableHeaderCell key={h.name}>{h.name}</TableHeaderCell>
  ));
  const tableBody = previewData.slice(0, 10).map((item, row_index) => (
    <TableRow key={row_index}>
      {header.map((h, col_index) => (
        <TableCell key={row_index + "-" + col_index}>
          <Text>
            {h.type === "RECORD" ? JSON.stringify(item[h.name]) : item[h.name]}
          </Text>
        </TableCell>
      ))}
    </TableRow>
  ));

  return (
    <Card className="max-w-6xl mx-auto">
      <Flex>
        <Title>Table Preview</Title>
        <Button icon={ArrowPathIcon} onClick={onReset}>
          Start Over
        </Button>
      </Flex>
      <Text>Table name: {fileName}</Text>
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
