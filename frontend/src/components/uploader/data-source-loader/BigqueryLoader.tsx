import { Button, Card, Flex, Text, TextInput } from "@tremor/react";
import { useState } from "react";
import { BigquerySchema } from "../../../types/data-source";

const apiPath = "/api/data-source/bigquery/schema";

interface Props {
  onLoadingSchema: () => void;
  onSchemaLoaded: (schema: BigquerySchema) => void;
}

export default function BigqueryLoader({
  onLoadingSchema,
  onSchemaLoaded,
}: Props) {
  const [tableName, setTableName] = useState<string>();
  const [isValid, setIsValid] = useState<boolean>(false);

  async function loadSchema() {
    onLoadingSchema();
    const response = await fetch(
      process.env.NODE_ENV === "development"
        ? `http://127.0.0.1:5001${apiPath}/${tableName}`
        : `${apiPath}/${tableName}`,
      {
        mode: "cors",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const schema = await response.json();
    onSchemaLoaded(schema);
  }

  return (
    <Card>
      <div className="grid justify-center items-center gap-2 grid-cols-10">
        <Text className="col-span-1 text-black">Table name:</Text>
        <TextInput
          className="col-span-9"
          placeholder="Enter the full table name"
          value={tableName}
          onChange={(e) => {
            setTableName(e.target.value);
          }}
        />
      </div>
      <div className="grid justify-center items-center gap-2 grid-cols-10 pt-2">
        <Text className="col-start-2 col-span-9 pl-1">
          Please use the full table name in format of:
          [project].[dataset].[table]
        </Text>
      </div>

      <Flex justifyContent="center" className="pt-4">
        <Button
          disabled={isValid}
          onClick={() => {
            loadSchema();
          }}
        >
          Next
        </Button>
      </Flex>
    </Card>
  );
}
