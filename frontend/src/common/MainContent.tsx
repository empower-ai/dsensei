import * as Sentry from "@sentry/react";
import { Flex } from "@tremor/react";
import { ReactNode } from "react";
import { useTracking } from "./tracking";

interface Props {
  children: ReactNode;
}

export function MainContent({ children }: Props) {
  const { startTrackingIfNeeded } = useTracking();
  startTrackingIfNeeded();

  return (
    <>
      <main>
        <Sentry.ErrorBoundary
          fallback={
            <Flex justifyContent="center" className="pt-20">
              Unexpected error happened, apologies for the inconvenience, please
              contact us at:
              <a
                href="mailto:founders@dsensei.app"
                className="text-blue-500 pl-2"
              >
                founders@dsensei.app
              </a>
            </Flex>
          }
        >
          {children}
        </Sentry.ErrorBoundary>
      </main>
    </>
  );
}
