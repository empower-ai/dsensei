import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  text: string;
}

export function TooltipIcon({ text }: Props) {
  return (
    <>
      <div
        className="tooltip tooltip-bottom before:z-10 before:bg-white before:break-words before:whitespace-normal before:text-start before:text-gray-500 before:border-2 before:border-black before:h-max-content before:w-max-content"
        data-tip={text}
      >
        <span className="h-5 w-5 block">
          <QuestionMarkCircleIcon />
        </span>{" "}
      </div>
    </>
  );
}
