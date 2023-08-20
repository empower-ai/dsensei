import { Text } from "@tremor/react";

interface Props {
  href?: string;
  onClick?: (() => Promise<void>) | (() => void);
  icon?: React.ElementType;
  text: string;
  isSelected?: boolean;
}

export default function SidebarElement({
  href,
  onClick,
  icon,
  text,
  isSelected,
}: Props) {
  const Icon = icon;
  return (
    <li>
      <a
        href={href ?? "/"}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <p>{isSelected}</p>
        <Text
          className={
            (isSelected ? "bg-gray-100" : "") +
            " flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-700 rounded-md hover:bg-gray-100 dark:bg-gray-900 dark:text-white"
          }
        >
          {Icon && <Icon width={16} height={16} />}
          {text}
        </Text>
      </a>
    </li>
  );
}
