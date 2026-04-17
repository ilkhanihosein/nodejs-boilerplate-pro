import pino from "pino";
import type { LevelWithSilent, Logger } from "pino";
import { getRequestId } from "./context/request-context.js";
import { env } from "../config/env.js";

const validLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

function isValidLevel(level: string): level is LevelWithSilent {
  return (validLevels as readonly string[]).includes(level);
}

const level: LevelWithSilent = isValidLevel(env.logLevel)
  ? env.logLevel
  : env.nodeEnv === "production"
    ? "info"
    : "debug";

const rootLogger = pino({
  level,
  base: {
    pid: process.pid,
    env: env.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
    ],
    remove: true,
  },
});

/** Root pino instance passed to `pino-http`. Prefer `getLogger()` for application code. */
export const logger = rootLogger;

/**
 * Application logger: after `bindRequestContext`, binds `requestId` from AsyncLocalStorage
 * so it matches access and error logs.
 */
export function getLogger(): Logger {
  const requestId = getRequestId();
  return requestId !== undefined ? rootLogger.child({ requestId }) : rootLogger;
}
