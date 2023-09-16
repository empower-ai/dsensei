import { ReactElement } from "react";

interface Props {
  text: string;
  children: ReactElement;
}

export function Tooltip({ text, children }: Props) {
  return (
    <>
      <div
        className="tooltip tooltip-top before:z-10 before:bg-white before:break-words before:whitespace-normal before:text-start before:text-gray-500 before:border-2 before:border-black before:h-max-content before:w-max-content"
        data-tip={text}
      >
        <span className="h-5 w-5 block">{children}</span>{" "}
      </div>
    </>
  );
}
