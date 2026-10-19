"use client";

import * as React from "react";

import { flags } from "@/lib/integrations";

/**
 * Telemetría opcional (feature-flag). Sin claves en el entorno, este
 * componente no descarga ni ejecuta nada.
 */
export function Telemetry() {
  React.useEffect(() => {
    let posthogCleanup: (() => void) | undefined;
    let sentryCleanup: (() => void) | undefined;

    if (flags.posthog) {
      void import("posthog-js").then((posthog) => {
        posthog.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST ??
            "https://us.i.posthog.com",
          capture_pageview: true,
        });
        posthogCleanup = () => posthog.default.reset();
      });
    }

    if (flags.sentry) {
      void import("@sentry/browser").then((Sentry) => {
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
          environment: process.env.NODE_ENV,
          tracesSampleRate: 0.1,
        });
        sentryCleanup = () => Sentry.close();
      });
    }

    return () => {
      posthogCleanup?.();
      sentryCleanup?.();
    };
  }, []);

  return null;
}
