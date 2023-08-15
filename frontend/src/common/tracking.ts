import * as amplitude from "@amplitude/analytics-browser";
import { useCookies } from "react-cookie";

const COOKIE_KEY_ENABLE_TRACKING = "send_usage_data";

function startAmplitude() {
  if (process.env.NODE_ENV === "production") {
    amplitude.init("25ee2cb2c8ee801e81191f0ad4f5f3ae");
  }
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
    if (isTrackingEnabled()) {
      startAmplitude();
    }
  }

  function trackEvent(name: string, data: Object) {
    if (isTrackingEnabled()) {
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
