import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  text: string;
}

export function TooltipIcon({ text }: Props) {
  return (
    <div className="tooltip tooltip-right" data-tip={text}>
      <span className="h-5 w-5 block">
        <QuestionMarkCircleIcon />
      </span>{" "}
    </div>
  );
}
