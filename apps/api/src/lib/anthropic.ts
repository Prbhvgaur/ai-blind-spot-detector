import Anthropic from "@anthropic-ai/sdk";

import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __blindspotAnthropic__: Anthropic | undefined;
}

export const anthropic =
  global.__blindspotAnthropic__ ??
  new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY
  });

if (env.NODE_ENV !== "production") {
  global.__blindspotAnthropic__ = anthropic;
}

