import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Title, Card, Flex, Text } from "@tremor/react";

import DataPreviewer from "../components/uploader/DataPreviewer";
import DataConfig from "../components/uploader/DataConfig";

function CsvUploader() {
  const [file, setFile] = useState<File | null>();
  const [header, setHeader] = useState<string[]>([]);
  const [data, setData] = useState<{ [k: string]: string }[]>([]);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string>("");

  const fileReader = new FileReader();

  const csvFileToArray = (raw_string: string) => {
    const csvHeader = raw_string.slice(0, raw_string.indexOf("\n")).split(",");
    const csvRows = raw_string.slice(raw_string.indexOf("\n") + 1).split("\n");

    const array = csvRows.map((i) => {
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

    setContent(raw_string);
    setData(array);
    setHeader(csvHeader);
  };

  const onDrop = useCallback(<T extends File>(acceptedFiles: T[]) => {
    fileReader.onload = function (event) {
      const text = event.target?.result;
      if (!text || typeof text !== "string") {
        throw new Error("failed to load CSV file");
      }
      csvFileToArray(text);
    };

    try {
      fileReader.readAsText(acceptedFiles[0]);
      setFile(acceptedFiles[0]);
    } catch (e) {
      setError("Cannot load the file. Please upload a valid CSV file.");
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "text/*": [".csv"] },
    onDragEnter: () => {},
    onDragLeave: () => {},
    onDragOver: () => {},
  });

  return (
    <div className="flex flex-col gap-6 justify-center items-center pt-20">
      <Title className="pt-6">New Report</Title>
      {header.length === 0 && (
        <>
          <Text>Please Upload a CSV file to start.</Text>
          <Card className="max-w-3xl mx-auto">
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
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop the csv file here.
                    </p>
                  </div>
                  <input type="file" {...getInputProps()} />
                </label>
              </div>
            </div>
            <Flex justifyContent="center" className="pt-5">
              {error && <Text color="red">{error}</Text>}
            </Flex>
          </Card>
        </>
      )}
      {header.length > 0 && data.length > 0 && (
        <DataConfig header={header} data={data} csvContent={content} />
      )}
      {header.length > 0 && (
        <DataPreviewer
          fileName={file?.name}
          onReset={() => {
            setFile(null);
            setData([]);
            setHeader([]);
            setContent("");
            console.log("test");
          }}
          header={header}
          data={data}
        />
      )}
    </div>
  );
}

export default CsvUploader;
