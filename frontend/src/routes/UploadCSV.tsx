import React, { useState } from "react";
import type { FormEvent, MouseEvent } from "react";

import { Title, Button, Card, Flex } from "@tremor/react";

import DataPreviewer from "../components/uploader/DataPreviewer";
import DataConfig from "../components/uploader/DataConfig";

function CsvUploader() {
  const [file, setFile] = useState<File>();
  const [header, setHeader] = useState<string[]>([]);
  const [data, setData] = useState<{ [k: string]: string }[]>([]);

  const fileReader = new FileReader();

  const handleOnChange = (e: FormEvent) => {
    const file = (e.currentTarget as HTMLInputElement).files?.item(0);
    if (file) {
      setFile(file);
    }
  };

  const handleOnSubmit = (e: MouseEvent) => {
    e.preventDefault();

    if (file) {
      fileReader.onload = function (event) {
        const text = event.target?.result;
        if (!text || typeof text !== "string") {
          throw new Error("failed to load CSV file");
        }
        csvFileToArray(text);
      };

      fileReader.readAsText(file);
    }
  };

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

    setData(array);
    setHeader(csvHeader);
  };

  return (
    <div className="flex flex-col gap-6 justify-center items-center">
      <Title className="pt-6">CSV Upload</Title>
      <Card className="max-w-3xl mx-auto">
        <form>
          <Flex>
            <Flex>
              <input
                type={"file"}
                id={"csvFileInput"}
                accept={".csv"}
                onChange={handleOnChange}
              />
            </Flex>
            <Flex justifyContent="end">
              <Button
                onClick={(e) => {
                  handleOnSubmit(e);
                }}
              >
                Upload
              </Button>
            </Flex>
          </Flex>
        </form>
      </Card>
      {header.length > 0 && data.length > 0 ? (
        <DataConfig header={header} data={data} />
      ) : null}
      {header.length > 0 ? <DataPreviewer header={header} data={data} /> : null}

    </div>
  );
}

export default CsvUploader;
