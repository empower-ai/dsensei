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
import { useNavigate } from "react-router-dom";
import DataPreviewer from "../components/uploader/DataPreviewer";
import InformationCard from "../components/uploader/InformationCard";
import CSVBasedReportConfig from "../components/uploader/report-config/CSVBasedReportConfig";
import { CSVSchema, Schema } from "../types/data-source";
import CsvUploader from "./UploadCSV";

function NewReport() {
  const navigate = useNavigate();

  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);
  const [schema, setSchema] = useState<Schema>();
  const [useSampleFile, setUseSampleFile] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>("csv");

  return (
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
          <Grid numItems={10}>
            <Flex
              justifyContent="center"
              alignItems="center"
              className="pb-4 col-span-6 col-start-3 gap-3"
            >
              <Text className="w-auto">Select data source:</Text>
              <Select
                className="w-2 min-w-[150px]"
                value={dataSource}
                onValueChange={setDataSource}
              >
                <SelectItem value="csv">CSV</SelectItem>
              </Select>
            </Flex>
          </Grid>
          <CsvUploader
            useSampleFile={useSampleFile}
            onLoadingSchema={() => {
              setIsLoadingSchema(true);
            }}
            onSchemaLoaded={(schema: CSVSchema) => {
              setSchema(schema);
              setIsLoadingSchema(false);
            }}
          />
        </Card>
      )}
      {schema && (
        <>
          <CSVBasedReportConfig
            schema={schema as CSVSchema}
            prefillWithSampleData={useSampleFile}
          />
          <DataPreviewer
            fileName={schema.name}
            onReset={() => {
              setIsLoadingSchema(false);
              setSchema(undefined);
              setUseSampleFile(false);
              setDataSource("csv");
            }}
            header={schema.fields}
            previewData={schema.previewData}
          />
        </>
      )}
      <InformationCard />
    </div>
  );
}

export default NewReport;
