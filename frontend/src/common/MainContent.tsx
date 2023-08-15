import { ReactNode } from "react";
import { NavBar } from "./navbar";
import { useTracking } from "./tracking";

interface Props {
  children: ReactNode;
}

export function MainContent({ children }: Props) {
  const { startTrackingIfNeeded } = useTracking();
  startTrackingIfNeeded();

  return (
    <>
      <NavBar />
      <main className="pt-18">{children}</main>
    </>
  );
}
