import mongoose from "mongoose";
import { env } from "../../config/env.js";
import type { HealthLivenessResponse, HealthReadyResponse } from "./health.schemas.js";

const MONGO_STATE_LABEL: Record<number, string> = {
  [mongoose.ConnectionStates.disconnected]: "disconnected",
  [mongoose.ConnectionStates.connected]: "connected",
  [mongoose.ConnectionStates.connecting]: "connecting",
  [mongoose.ConnectionStates.disconnecting]: "disconnecting",
};

function mongoStateLabel(readyState: number): string {
  return MONGO_STATE_LABEL[readyState] ?? "unknown";
}

export function getHealthLivenessPayload(): HealthLivenessResponse {
  return {
    status: "ok",
    service: "e-commerce-api",
    apiVersion: env.apiVersion,
    ...(env.gitSha ? { gitSha: env.gitSha } : {}),
  };
}

export function getHealthReadinessResult(): {
  httpStatus: 200 | 503;
  body: HealthReadyResponse;
} {
  const readyState = mongoose.connection.readyState;
  const connected = readyState === mongoose.ConnectionStates.connected;
  const body: HealthReadyResponse = {
    status: connected ? "ready" : "not_ready",
    service: "e-commerce-api",
    apiVersion: env.apiVersion,
    ...(env.gitSha ? { gitSha: env.gitSha } : {}),
    mongo: {
      readyState,
      state: mongoStateLabel(readyState),
    },
  };
  return { httpStatus: connected ? 200 : 503, body };
}
