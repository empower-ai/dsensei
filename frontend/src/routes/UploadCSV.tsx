import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  Card,
  Divider,
  Flex,
  Text,
  Title,
} from "@tremor/react";

import DataConfig from "../components/uploader/DataConfig";
import DataPreviewer from "../components/uploader/DataPreviewer";

function CsvUploader() {
  const [file, setFile] = useState<File>();
  const [header, setHeader] = useState<string[]>([]);
  const [data, setData] = useState<{ [k: string]: string }[]>([]);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string>("");

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
    const fileReader = new FileReader();

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
      {header.length === 0 && (
        <>
          <Text>
            Please Upload a CSV file to start (
            <a
              target="_blank"
              href={process.env.PUBLIC_URL + "/sample_data.csv"}
              className="text-blue-800"
              rel="noreferrer"
            >
              sample csv
            </a>
            )
          </Text>
          <Card className="max-w-6xl">
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
            {error && (
              <Flex justifyContent="center" className="pt-5">
                <Text color="red">{error}</Text>
              </Flex>
            )}
          </Card>
        </>
      )}
      {header.length > 0 && data.length > 0 && (
        <DataConfig
          header={header}
          data={data}
          csvContent={content}
          file={file}
        />
      )}
      {header.length > 0 && (
        <DataPreviewer
          fileName={file?.name}
          onReset={() => {
            setFile(undefined);
            setData([]);
            setHeader([]);
            setContent("");
          }}
          header={header}
          data={data}
        />
      )}
      <Card className="max-w-6xl p-3">
        <Accordion defaultOpen={true} className="border-0">
          <AccordionHeader>
            <Title>How to use DSensei?</Title>
          </AccordionHeader>
          <AccordionBody>
            <iframe
              className="w-[100%] h-[550px]"
              title="Demo"
              allowFullScreen={true}
              seamless={true}
              src="https://www.loom.com/embed/9bd150ea3ef945fca3754e3fcf8a2602?sid=492e4f71-19a4-44c5-a2fa-f6bd4cfd1292"
            />
          </AccordionBody>
        </Accordion>
        <Accordion className="border-0">
          <AccordionHeader>
            <Title>What is DSensei?</Title>
          </AccordionHeader>
          <AccordionBody>
            DSensei is an open-source insight discovery engine that goes beyond
            traditional BI dashboards by uncovering patterns and revelations in
            datasets. While BI dashboards can answer the question of "what,"
            they fall short of explaining the "why." As a result, when facing
            movements in metrics, it often requires significant manual effort to
            explore various combinations and identify the underlying causes.
            <br />
            <br />
            For example, consider an e-commerce platform experiencing a recent
            surge in return orders. To pinpoint the reason, one would need to
            generate multiple hypotheses (E.g: Is the rise in returns limited to
            specific brands, product categories, regions, or some specific
            combinations? Is there a global phenomenon influenced by a general
            increase in the number of orders.) and conduct extensive slicing and
            dicing to uncover potential factors. This process can be arduous and
            time-consuming.
            <br />
            <br />
            We built DSensei to address this. By autonomously exploring all
            possible combinations over a specified time period, DSensei offers a
            holistic view of the data and presents the top drivers in a
            user-friendly interface. This empowers users to establish a holistic
            view of all the key drivers and delve into each factor effortlessly
            and gain intuitive insights into the reasons behind specific
            movements in their datasets. As a result, users can get the answer
            to the “why” more effectively.
          </AccordionBody>
        </Accordion>
        <Accordion className="border-0">
          <AccordionHeader>
            <Title>Can I host/run DSensei locally?</Title>
          </AccordionHeader>
          <AccordionBody>
            Yes, you absolute can! DSensei is open sourced, we provide multiple
            ways of hosting. Check our{" "}
            <a
              href="https://github.com/dsensei/dsensei-insight"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500"
            >
              document
            </a>{" "}
            for more details.
          </AccordionBody>
        </Accordion>
        <Accordion className="border-0">
          <AccordionHeader>
            <Title>
              Can DSensei pull data directly from my database / data warehouse?
            </Title>
          </AccordionHeader>
          <AccordionBody>
            Not yet, we're actively working on it! We'd love to hear your need,
            please contact us via{" "}
            <a href="mailto:founders@dsensei.app" className="text-blue-500">
              email
            </a>{" "}
            or{" "}
            <a
              href="https://discord.gg/5yUtntbw"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500"
            >
              discord
            </a>{" "}
            .
          </AccordionBody>
        </Accordion>
        <Accordion className="border-0">
          <AccordionHeader>
            <Title>I have some feedback or need some feature.</Title>
          </AccordionHeader>
          <AccordionBody>
            We're currently actively developing the project, and would
            appreciate all your feedback and feature request. Please contact us
            via{" "}
            <a href="mailto:founders@dsensei.app" className="text-blue-500">
              email
            </a>{" "}
            or{" "}
            <a
              href="https://discord.gg/5yUtntbw"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500"
            >
              discord
            </a>
            .
          </AccordionBody>
        </Accordion>
        <Divider className="mt-1 mb-1" />
        <Text className="pt-1">
          Like the project? Star us on{" "}
          <a
            href="https://github.com/dsensei/dsensei-insight"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500"
          >
            github
          </a>
          .
        </Text>
      </Card>
    </div>
  );
}

export default CsvUploader;
