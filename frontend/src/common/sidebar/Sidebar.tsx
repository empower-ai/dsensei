import { Flex } from "@tremor/react";
import { ReactElement } from "react";
import logo from "../../assets/logo.png";
import SidebarFooter from "./SidebarFooter";

interface Props {
  elements: ReactElement[];
}

export default function Sidebar({ elements }: Props) {
  return (
    <div
      id="docs-sidebar"
      className="fixed top-0 left-0 bottom-0 z-[60] w-72 bg-white border-r border-gray-200 shadow pt-7 pb-10 overflow-y-auto scrollbar-y lg:block lg:translate-x-0 lg:right-auto lg:bottom-0 dark:scrollbar-y dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="px-6">
        <Flex justifyContent="start" className="text-xl font-semibold">
          <img className="h-12 w-12 mr-2" src={logo} alt="Logo" />
          DSensei
        </Flex>
      </div>
      <nav className="hs-accordion-group p-6 w-full flex flex-col flex-wrap">
        <ul className="space-y-1.5">{elements.map((element) => element)}</ul>
        <SidebarFooter />
      </nav>
    </div>
  );
}
