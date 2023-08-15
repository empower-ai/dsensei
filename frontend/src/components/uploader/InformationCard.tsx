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
import { useTracking } from "../../common/tracking";

export default function InformationCard() {
  const { isTrackingEnabled, enableTracking, disableTracking } = useTracking();

  return (
    <Card className="max-w-6xl p-3">
      <Accordion defaultOpen={true} className="border-0">
        <AccordionHeader>
          <Title>What is DSensei?</Title>
        </AccordionHeader>
        <AccordionBody>
          <iframe
            className="w-[100%] h-[550px]"
            title="Demo"
            allowFullScreen={true}
            seamless={true}
            src="https://www.loom.com/embed/b945578d62ad4ec8b929d50d8b37081e?sid=6f7b640c-3368-4e23-9b00-b51d49448ae4"
          />
          <br />
          DSensei is an AI-powered key driver analysis engine that can pinpoint
          the root cause of metric fluctuations within one minute. We save data
          teams hours to days of manual work on root cause analysis and help
          organizations uncover critical drivers and segments that are otherwise
          easy to overlook.
          <br />
          <br />
          DSensei overcome the limitation of existing BI tools to empower you to
          understand the "why" behind metric fluctuations to inform better
          business decisions more effectively. Checkout our{" "}
          <a
            href="https://www.dsensei.app/article/why-do-you-need-a-key-driver-analysis-engine"
            target="_blank"
            className="text-blue-500"
            rel="noreferrer"
          >
            blog
          </a>{" "}
          for more details.
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
            href="https://discord.gg/B96nhQzX"
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
          We're currently actively developing the project, and would appreciate
          all your feedback and feature request. Please contact us via{" "}
          <a href="mailto:founders@dsensei.app" className="text-blue-500">
            email
          </a>{" "}
          or{" "}
          <a
            href="https://discord.gg/B96nhQzX"
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
      <Flex justifyContent="between">
        <Flex justifyContent="start" className="gap-2">
          <input
            type="checkbox"
            checked={isTrackingEnabled()}
            onChange={() => {
              if (isTrackingEnabled()) {
                disableTracking();
              } else {
                enableTracking();
              }
            }}
          />
          <Text>Send anonymous usage data to help us improve the product.</Text>
        </Flex>
        <Flex justifyContent="end">
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
        </Flex>
      </Flex>
    </Card>
  );
}
