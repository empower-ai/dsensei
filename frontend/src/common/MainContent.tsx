import { ReactNode } from "react";
import { NavBar } from "./navbar";

interface Props {
  children: ReactNode;
}

export function MainContent({ children }: Props) {
  return (
    <>
      <NavBar />
      <main className="pt-18">{children}</main>
    </>
  );
}
