import { Bold, Button, Card, Flex, Text, TextInput } from "@tremor/react";
import { ReactElement, useState } from "react";
import { BigquerySchema } from "../../../types/data-source";

const apiPath = "/api/data-source/bigquery/schema";

interface Props {
  onLoadingSchema: () => void;
  onSchemaLoaded: (schema?: BigquerySchema) => void;
}

export default function BigqueryLoader({
  onLoadingSchema,
  onSchemaLoaded,
}: Props) {
  const [tableName, setTableName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<ReactElement>();
  const [isTableNameValid, setIsTableNameValid] = useState<boolean>(false);

  async function loadSchema() {
    onLoadingSchema();
    try {
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
      switch (response.status) {
        case 500:
          setErrorMessage(
            <Text color="red">
              Server error, please retry. If the issue persists, please contact
              us at{" "}
              <a href="mailto:founders@dsensei.app" className="text-blue-500">
                email
              </a>
            </Text>
          );
          onSchemaLoaded(undefined);
          break;
        case 403:
          setErrorMessage(
            <Text color="red">
              Auth failed, please run `gcloud auth application-default login` in
              terminal and restart the server.
            </Text>
          );
          onSchemaLoaded(undefined);

          break;
        case 404:
          setErrorMessage(
            <Text color="red">
              Table {tableName} doesn't exist, please double check and update.
            </Text>
          );
          onSchemaLoaded(undefined);
          break;
        default:
          const schema = await response.json();
          onSchemaLoaded(schema);
      }
    } catch (e) {
      setErrorMessage(
        <Text color="red">
          Server error, please retry. If the issue persists, please contact us
          at{" "}
          <a href="mailto:founders@dsensei.app" className="text-blue-500">
            email
          </a>
        </Text>
      );
      onSchemaLoaded(undefined);
    }
  }

  function onTableNameChanged(tableName: string) {
    if (tableName.match(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/)) {
      setIsTableNameValid(true);
    } else {
      setIsTableNameValid(false);
    }

    setErrorMessage(undefined);
    setTableName(tableName);
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
            onTableNameChanged(e.target.value);
          }}
        />
      </div>
      <div className="grid justify-center items-center gap-2 grid-cols-10 pt-2">
        <Text className="col-start-2 col-span-9 pl-1">
          Use the full table name in format of:{" "}
          <Bold>[project].[dataset].[table]</Bold>. For instance:
          dsensei.sample_dataset.sample_table
        </Text>
        <Text className="col-start-2 col-span-9 pl-1">
          {!isTableNameValid && tableName.length > 0 && (
            <Text color="red">Please enter a valid full table name.</Text>
          )}
        </Text>
        <div className="col-start-2 col-span-9 pl-1">{errorMessage}</div>
      </div>
      <Flex justifyContent="center" className="pt-4">
        <Button
          disabled={!isTableNameValid || errorMessage !== undefined}
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
