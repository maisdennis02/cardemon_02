"use client";

import { useEffect } from "react";
import { postHog } from "@/lib/posthog";

/** Starts PostHog on first paint where it is configured. Renders nothing. */
export function PostHogInit() {
  useEffect(() => {
    void postHog();
  }, []);
  return null;
}
