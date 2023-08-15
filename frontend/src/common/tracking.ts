import * as amplitude from "@amplitude/analytics-browser";
import * as Sentry from "@sentry/react";
import { useCookies } from "react-cookie";

const COOKIE_KEY_ENABLE_TRACKING = "send_usage_data";
let initialized = false;

function startAmplitude() {
  amplitude.init("25ee2cb2c8ee801e81191f0ad4f5f3ae");
}

function startSentry() {
  Sentry.init({
    dsn: "https://53f2ab1ff6319474338bb32b871952a7@o4505710546190336.ingest.sentry.io/4505710548549632",
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ["*"],
      }),
      new Sentry.Replay(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function useTracking(): {
  isTrackingEnabled: () => boolean;
  enableTracking: () => void;
  disableTracking: () => void;
  startTrackingIfNeeded: () => void;
  trackEvent: (name: string, data: Object) => void;
} {
  const [cookies, setCookie] = useCookies([COOKIE_KEY_ENABLE_TRACKING]);

  function isTrackingEnabled(): boolean {
    return (
      cookies[COOKIE_KEY_ENABLE_TRACKING] === "true" ||
      cookies[COOKIE_KEY_ENABLE_TRACKING] === undefined
    );
  }

  function enableTracking() {
    setCookie(COOKIE_KEY_ENABLE_TRACKING, "true");
    startAmplitude();
  }

  function disableTracking() {
    setCookie(COOKIE_KEY_ENABLE_TRACKING, "false");
    window.location.reload();
  }

  function startTrackingIfNeeded() {
    if (isTrackingEnabled() && !initialized) {
      startAmplitude();
      startSentry();
      initialized = true;
    }
  }

  function trackEvent(name: string, data: Object) {
    if (isTrackingEnabled() && process.env.NODE_ENV === "production") {
      amplitude.track(name, data);
    }
  }

  return {
    isTrackingEnabled,
    enableTracking,
    disableTracking,
    startTrackingIfNeeded,
    trackEvent,
  };
}
