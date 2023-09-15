import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Flex, Text } from "@tremor/react";

import apiManager from "../../../common/apiManager";
import { CSVSchema } from "../../../types/data-source";

interface Props {
  useSampleFile?: boolean;
  onLoadingSchema: () => void;
  onSchemaLoaded: (schema: CSVSchema) => void;
}

function CSVLoader({ useSampleFile, onLoadingSchema, onSchemaLoaded }: Props) {
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function init() {
      if (useSampleFile) {
        onLoadingSchema();
        const response = await fetch(
          process.env.PUBLIC_URL + "/sample_data.csv"
        );
        const blobData = await response.blob();
        const file = new File([blobData], "sample_data.csv", {
          type: blobData.type,
        });

        loadSchema(file);
      }
    }
    init();
  }, [useSampleFile]);

  async function loadSchema(file: File) {
    const formData = new FormData();
    formData.append("file", file!);
    try {
      const schema = await apiManager.postForm<CSVSchema>(
        "/api/v1/source/file/schema",
        formData
      );
      onSchemaLoaded(schema);
    } catch (e) {
      setError("Cannot load the file. Please upload a valid CSV file.");
      return;
    }
  }

  const onDrop = async <T extends File>(acceptedFiles: T[]) => {
    onLoadingSchema();
    loadSchema(acceptedFiles[0]);
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
