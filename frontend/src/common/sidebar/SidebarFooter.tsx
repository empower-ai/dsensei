import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { Flex, Text } from "@tremor/react";
import discord from "../../assets/discord.svg";
import github from "../../assets/github.svg";

export default function SidebarFooter() {
  return (
    <div className="absolute inset-x-0 bottom-6">
      <Flex justifyContent="center" className="items-center gap-3">
        <Text>Contact Us:</Text>
        <a href="https://discord.gg/6h5cdNhK" target="_blank" rel="noreferrer">
          <img className="h-6 w-6" src={discord} alt="discord group" />{" "}
        </a>
        <a
          href="https://github.com/dsensei/dsensei-insight"
          target="_blank"
          rel="noreferrer"
        >
          <img className="h-5 w-5 mb-1" src={github} alt="discord group" />{" "}
        </a>
        <a href="mailto:founders@dsensei.app">
          <EnvelopeIcon width={25} height={25} className="mb-1" />
        </a>
      </Flex>
    </div>
  );
}
