import {
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  Select,
  SelectItem,
  Text,
  Title,
} from "@tremor/react";

import { useState } from "react";
import { NavBar } from "../common/navbar";
import DataPreviewer from "../components/uploader/DataPreviewer";
import InformationCard from "../components/uploader/InformationCard";
import BigqueryLoader from "../components/uploader/data-source-loader/BigqueryLoader";
import CSVLoader from "../components/uploader/data-source-loader/CSVLoader";
import BigqueryBasedReportConfig from "../components/uploader/report-config/BigqueryBasedReportConfig";
import CSVBasedReportConfig from "../components/uploader/report-config/CSVBasedReportConfig";
import {
  BigquerySchema,
  CSVSchema,
  DataSourceType,
  Schema,
} from "../types/data-source";

function NewReport() {
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);
  const [schema, setSchema] = useState<Schema>();
  const [useSampleFile, setUseSampleFile] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<DataSourceType>("csv");

  function renderDataSourceLoader() {
    if (window.location.hostname === "app.dsensei.app") {
      return (
        <>
          <Flex justifyContent="center" className="pb-4">
            <Text>Start a new report by uploading a CSV file</Text>
          </Flex>
          <CSVLoader
            useSampleFile={useSampleFile}
            onLoadingSchema={() => {
              setIsLoadingSchema(true);
            }}
            onSchemaLoaded={(schema: CSVSchema) => {
              setSchema(schema);
              setIsLoadingSchema(false);
            }}
          />
        </>
      );
    }
    return (
      <>
        <Grid numItems={10}>
          <Flex
            justifyContent="center"
            alignItems="center"
            className="pb-4 col-span-6 col-start-3 gap-3"
          >
            <Text className="w-auto text-black">Select data source:</Text>
            <Select
              className="w-2 min-w-[150px]"
              value={dataSource}
              onValueChange={(value) => setDataSource(value as DataSourceType)}
            >
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="bigquery">BigQuery</SelectItem>
            </Select>
          </Flex>
        </Grid>
        {dataSource === "csv" && (
          <CSVLoader
            useSampleFile={useSampleFile}
            onLoadingSchema={() => {
              setIsLoadingSchema(true);
            }}
            onSchemaLoaded={(schema: CSVSchema) => {
              setSchema(schema);
              setIsLoadingSchema(false);
            }}
          />
        )}
        {dataSource === "bigquery" && (
          <BigqueryLoader
            onLoadingSchema={() => {
              setIsLoadingSchema(true);
            }}
            onSchemaLoaded={(schema?: BigquerySchema) => {
              if (schema) {
                setSchema(schema);
              }
              setIsLoadingSchema(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="flex flex-col gap-2 justify-center items-center pt-20">
        <Title>New Report</Title>
        {isLoadingSchema && !schema && (
          <Card className="max-w-6xl">
            <Flex className="h-64	gap-3" justifyContent="center">
              <p>Processing</p>
              <span className="loading loading-bars loading-lg"></span>
            </Flex>
          </Card>
        )}
        {!schema && (
          // TODO: Have to keep the component which has the logic to load schema, refactor
          // to move the file loading logic into action
          <Card
            className={`max-w-6xl ${
              !isLoadingSchema ? "visible" : "invisible h-0 p-0"
            }`}
          >
            <Flex justifyContent="center">
              <Button
                onClick={() => {
                  setDataSource("csv");
                  setUseSampleFile(true);
                }}
              >
                Try with Sample Data
              </Button>
            </Flex>
            <Flex justifyContent="center" className="gap 4">
              <Divider />
              <Text>or</Text>
              <Divider />
            </Flex>
            {renderDataSourceLoader()}
          </Card>
        )}
        {schema && (
          <>
            {dataSource === "csv" && (
              <CSVBasedReportConfig
                schema={schema as CSVSchema}
                prefillWithSampleData={useSampleFile}
              />
            )}
            {dataSource === "bigquery" && (
              <BigqueryBasedReportConfig schema={schema as BigquerySchema} />
            )}
            <DataPreviewer
              fileName={schema.name}
              onReset={() => {
                setIsLoadingSchema(false);
                setSchema(undefined);
                setUseSampleFile(false);
                setDataSource("csv");
              }}
              header={schema.fields}
              previewData={schema.previewData ?? []}
            />
          </>
        )}
        <InformationCard />
      </div>
    </>
  );
}

export default NewReport;
