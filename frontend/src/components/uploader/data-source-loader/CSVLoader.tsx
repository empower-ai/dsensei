import * as rd from "@duckdb/react-duckdb";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Flex, Text } from "@tremor/react";

import { CSVSchema, FieldMode, FieldType } from "../../../types/data-source";

interface Props {
  useSampleFile?: boolean;
  onLoadingSchema: () => void;
  onSchemaLoaded: (schema: CSVSchema) => void;
}

function CSVLoader({ useSampleFile, onLoadingSchema, onSchemaLoaded }: Props) {
  const [error, setError] = useState<string>("");

  const db = rd.useDuckDB();
  const resolveDB = rd.useDuckDBResolver();
  // Launch DuckDB
  useEffect(() => {
    async function init() {
      if (!db.resolving()) {
        resolveDB();
        return;
      }

      if (useSampleFile) {
        onLoadingSchema();
        const response = await fetch(
          process.env.PUBLIC_URL + "/sample_data.csv"
        );
        const blobData = await response.blob();
        const file = new File([blobData], "sample_data.csv", {
          type: blobData.type,
        });

        loadFile(file);
      }
    }
    init();
  }, [db, resolveDB, useSampleFile]);

  const loadCSVFile = async (raw_string: string, file: File) => {
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

    const res = await conn.query("DESCRIBE uploaded_content");
    const parsedHeaders = res.toArray().map((row) => {
      const rowInJson = row.toJSON();
      return {
        name: rowInJson.column_name as string,
        type: rowInJson.column_type as FieldType,
        mode: "NULLABLE" as FieldMode,
        numDistinctValues: 0,
      };
    });

    // @TODO: get rid of this to load directly from duckdb
    const csvRows = raw_string.slice(raw_string.indexOf("\n") + 1).split("\n");
    const previewData = csvRows.slice(0, 10).map((i) => {
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

    onSchemaLoaded({
      file: file,
      name: file.name,
      fields: parsedHeaders,
      previewData,
    });
  };

  async function loadFile(file: File) {
    const fileReader = new FileReader();
    fileReader.onload = async function (event) {
      const text = event.target?.result;
      if (!text || typeof text !== "string") {
        throw new Error("failed to load CSV file");
      }

      await loadCSVFile(text, file);
    };

    try {
      fileReader.readAsText(file);
    } catch (e) {
      setError("Cannot load the file. Please upload a valid CSV file.");
    }
  }

  const onDrop = async <T extends File>(acceptedFiles: T[]) => {
    onLoadingSchema();
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
                <span className="font-semibold">Click to upload</span> or drag
                and drop the csv file here.
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
  );
}

export default CSVLoader;
