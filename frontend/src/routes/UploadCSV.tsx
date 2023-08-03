import * as rd from "@duckdb/react-duckdb";
import { MouseEvent, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Card, Flex, Text, Title } from "@tremor/react";

import DataConfig from "../components/uploader/DataConfig";
import DataPreviewer from "../components/uploader/DataPreviewer";
import InformationCard from "../components/uploader/InformationCard";

function CsvUploader() {
  const [file, setFile] = useState<File>();
  const [header, setHeader] = useState<{ name: string; type: string }[]>([]);
  const [previewData, setPreviewData] = useState<{ [k: string]: string }[]>([]);
  const [error, setError] = useState<string>("");
  const [isProcessFile, setIsProcessingFile] = useState<boolean>(false);
  const [fileLoaded, setFileLoaded] = useState<boolean>(false);

  const db = rd.useDuckDB();
  const resolveDB = rd.useDuckDBResolver();
  // Launch DuckDB
  useEffect(() => {
    if (!db.resolving()) {
      resolveDB();
    }
  }, [db, resolveDB]);

  const loadCSVFile = async (raw_string: string) => {
    const preparedDB = db.value!;
    preparedDB.reset();
    const csvHeader = raw_string.slice(0, raw_string.indexOf("\n")).split(",");

    const conn = await preparedDB.connect();
    await preparedDB.registerFileText(`data.csv`, raw_string);
    await conn.insertCSVFromPath("data.csv", {
      schema: "main",
      name: "uploaded_content",
      detect: true,
      header: true,
      delimiter: ",",
    });
    setIsProcessingFile(false);
    setFileLoaded(true);

    const res = await conn.query("DESCRIBE uploaded_content");
    const parsedHeaders = res.toArray().map((row) => {
      const rowInJson = row.toJSON();
      return {
        name: rowInJson.column_name,
        type: rowInJson.column_type,
      };
    });
    setHeader(parsedHeaders);

    // @TODO: get rid of this to load directly from duckdb
    const csvRows = raw_string.slice(raw_string.indexOf("\n") + 1).split("\n");
    const array = csvRows.slice(0, 10).map((i) => {
      const values = i.split(",");
      const obj = csvHeader.reduce(
        (object: { [k: string]: string }, header, index) => {
          object[header] = values[index];
          return object;
        },
        {}
      );
      return obj;
    });

    setPreviewData(array);
  };

  async function loadFile(file: File) {
    setIsProcessingFile(true);

    const fileReader = new FileReader();
    fileReader.onload = async function (event) {
      const text = event.target?.result;
      if (!text || typeof text !== "string") {
        throw new Error("failed to load CSV file");
      }
      await loadCSVFile(text);
    };

    try {
      fileReader.readAsText(file);
      setFile(file);
    } catch (e) {
      setError("Cannot load the file. Please upload a valid CSV file.");
    }
  }

  const onUseSampleFile = async (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const response = await fetch(process.env.PUBLIC_URL + "/sample_data.csv");
    const blobData = await response.blob();
    const file = new File([blobData], "sample_data.csv", {
      type: blobData.type,
    });

    loadFile(file);
  };

  const onDrop = async <T extends File>(acceptedFiles: T[]) => {
    loadFile(acceptedFiles[0]);
  };
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "text/*": [".csv"] },
    onDragEnter: () => {},
    onDragLeave: () => {},
    onDragOver: () => {},
  });

  return (
    <div className="flex flex-col gap-2 justify-center items-center pt-20">
      <Title>New Report</Title>
      {!fileLoaded && (
        <>
          <Text>
            Start a new report by uploading a CSV file or{" "}
            <a
              target="_blank"
              href={process.env.PUBLIC_URL + "/sample_data.csv"}
              className="text-blue-800"
              onClick={onUseSampleFile}
              rel="noreferrer"
            >
              try with sample data
            </a>
          </Text>
          <Card className="max-w-6xl">
            {isProcessFile && (
              <Flex className="h-64	gap-3" justifyContent="center">
                <p>Processing</p>
                <span className="loading loading-bars loading-lg"></span>
              </Flex>
            )}
            {!isProcessFile && !fileLoaded && (
              <>
                <div {...getRootProps()}>
                  <div className="flex items-center w-full justify-center">
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 20 16"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop the csv file here.
                        </p>
                      </div>
                    </label>
                  </div>
                  <input type="file" {...getInputProps()} />
                </div>
                {error && (
                  <Flex justifyContent="center" className="pt-5">
                    <Text color="red">{error}</Text>
                  </Flex>
                )}
              </>
            )}
          </Card>
        </>
      )}
      {fileLoaded && <DataConfig header={header} file={file} />}
      {fileLoaded && (
        <DataPreviewer
          fileName={file?.name}
          onReset={() => {
            setFile(undefined);
            setPreviewData([]);
            setHeader([]);
            setFileLoaded(false);
            db.value?.reset();
          }}
          header={header}
          previewData={previewData}
        />
      )}
      <InformationCard />
    </div>
  );
}

export default CsvUploader;
