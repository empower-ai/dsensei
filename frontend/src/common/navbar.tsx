import { Flex } from "@tremor/react";
import discord from "../assets/discord.svg";
import github from "../assets/github.svg";
import logo from "../assets/logo.png";
export function NavBar() {
  return (
    <nav className="fixed top-0 w-full h-16 px-8 flex flex-row items-center justify-between z-50 shadow bg-white">
      <Flex justifyContent="start">
        <div className="flex flex-row items-center justify-start">
          <img className="h-12 w-12 mr-2 mobile:hidden" src={logo} alt="Logo" />
          <h1 className="text-2xl font-bold mr-16 ">DSensei</h1>
        </div>
        <a href="/">New Report</a>
      </Flex>
      <Flex justifyContent="end" className="items-center gap-2">
        <h1>Contact Us:</h1>
        <a href="https://discord.gg/5yUtntbw" target="_blank" rel="noreferrer">
          <img className="h-6 w-6" src={discord} alt="discord group" />{" "}
        </a>
        |
        <a
          href="https://github.com/dsensei/dsensei-insight"
          target="_blank"
          rel="noreferrer"
        >
          <img className="h-5 w-5 mb-1" src={github} alt="discord group" />{" "}
        </a>
        |<a href="mailto:founders@dsensei.app">founders@dsensei.app</a>
      </Flex>
    </nav>
  );
}
