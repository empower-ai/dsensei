import { Bold, Button, Card, Flex, Text, TextInput } from "@tremor/react";
import { ReactElement, useState } from "react";
import { BigquerySchema } from "../../../types/data-source";

const apiPath = "/api/data-source/snowflake/schema";

interface Props {
  onLoadingSchema: () => void;
  onSchemaLoaded: (schema?: BigquerySchema) => void;
}

interface SnowflakeConection {
  account?: string;
  username?: string;
  password?: string;
  warehouse?: string;
  full_table_name?: string;
}

export default function SnowflakeLoader({
  onLoadingSchema,
  onSchemaLoaded,
}: Props) {
  const [tableName, setTableName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<ReactElement>();
  const [isTableNameValid, setIsTableNameValid] = useState<boolean>(false);
  const [connection, setConnection] = useState<SnowflakeConection>({});

  const onConnectionChange = (obj: SnowflakeConection) => {
    setConnection({
      ...connection,
      ...obj,
    })
  }

  async function loadSchema() {
    onLoadingSchema();
    try {
      const response = await fetch(
        process.env.NODE_ENV === "development"
          ? `http://127.0.0.1:5001${apiPath}`
          : `${apiPath}`,
        {
          mode: "cors",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(connection),
        }
      );
      switch (response.status) {
        case 500:
          setErrorMessage(
            <Text color="red">
              Server error, please retry. If the issue persists, please contact
              us at{" "}
              <a href="mailto:founders@dsensei.app" className="text-blue-500">
                founders@dsensei.app
              </a>
            </Text>
          );
          onSchemaLoaded(undefined);
          break;
        case 403:
          setErrorMessage(
            <Text color="red">
              Auth failed, please check your username and password.
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
          console.log(schema);
          onSchemaLoaded(schema);
      }
    } catch (e) {
      setErrorMessage(
        <Text color="red">
          Server error, please retry. If the issue persists, please contact us
          at{" "}
          <a href="mailto:founders@dsensei.app" className="text-blue-500">
            founders@dsensei.app
          </a>
        </Text>
      );
      onSchemaLoaded(undefined);
    }
  }

  function onTableNameChanged(full_table_name: string) {
    if (full_table_name.match(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_*-]+$/)) {
      setIsTableNameValid(true);
    } else {
      setIsTableNameValid(false);
    }
    onConnectionChange({full_table_name})

    setErrorMessage(undefined);
    setTableName(tableName);
  }

  return (
    <Card>
      <div className="grid justify-center items-center gap-2 grid-cols-10">
        <Text className="col-span-1 text-black">Account Info:</Text>
        <TextInput
          className="col-span-2"
          placeholder="Username"
          value={connection.username}
          onChange={(e) => {
            onConnectionChange({ username: e.target.value });
          }}
        />

        <TextInput
          className="col-span-2"
          placeholder="Password"
          value={connection.password}
          onChange={(e) => {
            onConnectionChange({ password: e.target.value });
          }}
        />

        <TextInput
          className="col-span-2"
          placeholder="Account"
          value={connection.account}
          onChange={(e) => {
            onConnectionChange({ account: e.target.value });
          }}
        />

        <TextInput
          className="col-span-2"
          placeholder="Warehouse"
          value={connection.warehouse}
          onChange={(e) => {
            onConnectionChange({ warehouse: e.target.value });
          }}
        />
      </div>

      <div className="grid justify-center items-center gap-2 grid-cols-10">
        <Text className="col-span-1 text-black">Table Info:</Text>
        <TextInput
          className="col-span-9"
          placeholder="Enter the full table name"
          value={connection.full_table_name}
          onChange={(e) => onTableNameChanged(e.target.value)}
        />
      </div>
      <div className="grid justify-center items-center gap-2 grid-cols-10 pt-2">
        <Text className="col-start-2 col-span-9 pl-1">
          Use the full table name in format of:{" "}
          <Bold>[database_name].[schema_name].[table_name]</Bold>. For instance:
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
