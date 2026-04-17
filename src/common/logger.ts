import pino from "pino";
import type { LevelWithSilent } from "pino";
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

export const logger = pino({
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
