import {
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  ProgressBar,
  Select,
  SelectItem,
  Text,
  Title,
} from "@tremor/react";

import { useState } from "react";
import { NavBar } from "../common/navbar";
import getSettings from "../common/server-data/settings";
import { formatNumber } from "../common/utils";
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [schema, setSchema] = useState<Schema>();
  const [useSampleFile, setUseSampleFile] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<DataSourceType>("csv");

  function renderCSVLoader() {
    return (
      <CSVLoader
        useSampleFile={useSampleFile}
        onLoadingSchema={() => {
          setIsLoadingSchema(true);
        }}
        onSchemaLoaded={(schema: CSVSchema) => {
          setSchema(schema);
          setIsLoadingSchema(false);
        }}
        onUploadingFile={(progress) => setUploadProgress(progress)}
      />
    );
  }

  function renderDataSourceLoader() {
    if (window.location.hostname === "app.dsensei.app") {
      return (
        <>
          <Flex justifyContent="center" className="pb-4">
            <Text>Start a new report by uploading a CSV file</Text>
          </Flex>
          {renderCSVLoader()}
        </>
      );
    }
    return (
      <>
        <Grid numItems={10}>
          {getSettings().enableBigqueryIntegration && (
            <Flex
              justifyContent="center"
              alignItems="center"
              className="pb-4 col-span-6 col-start-3 gap-3"
            >
              <Text className="w-auto text-black">Select data source:</Text>
              <Select
                className="w-2 min-w-[150px]"
                value={dataSource}
                onValueChange={(value) =>
                  setDataSource(value as DataSourceType)
                }
              >
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="bigquery">BigQuery</SelectItem>
              </Select>
            </Flex>
          )}
          {!getSettings().enableBigqueryIntegration && (
            <Flex justifyContent="center" className="pb-4 col-span-10">
              <Text>Start a new report by uploading a CSV file</Text>
            </Flex>
          )}
        </Grid>
        {dataSource === "csv" && renderCSVLoader()}
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

  function renderProgress() {
    if (dataSource !== "csv" || uploadProgress === 100.0) {
      return (
        <Flex className="h-64	gap-3" justifyContent="center">
          <p>Processing...</p>
          <span className="loading loading-bars loading-lg"></span>
        </Flex>
      );
    }

    if (uploadProgress < 100) {
      return (
        <Flex
          className="h-64	gap-3 w-[60%]"
          flexDirection="col"
          justifyContent="center"
        >
          <ProgressBar value={uploadProgress} />
          Uploading file &bull; {formatNumber(uploadProgress)}%
        </Flex>
      );
    }
  }

  return (
    <>
      <NavBar />
      <div className="flex flex-col gap-2 justify-center items-center pt-20">
        <Title>New Report</Title>
        {isLoadingSchema && !schema && (
          <Card className="max-w-6xl justify-center flex">
            <Flex className="h-64	gap-3 w-[60%]" justifyContent="center">
              {renderProgress()}
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
