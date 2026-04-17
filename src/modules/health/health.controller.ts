import type { Request, Response } from "express";
import mongoose from "mongoose";

const MONGO_STATE_LABEL: Record<number, string> = {
  [mongoose.ConnectionStates.disconnected]: "disconnected",
  [mongoose.ConnectionStates.connected]: "connected",
  [mongoose.ConnectionStates.connecting]: "connecting",
  [mongoose.ConnectionStates.disconnecting]: "disconnecting",
};

function mongoStateLabel(readyState: number): string {
  return MONGO_STATE_LABEL[readyState] ?? "unknown";
}

/**
 * Liveness: process is up. Does not check MongoDB (avoid restart loops when DB is down).
 */
export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: "ok",
    service: "e-commerce-api",
  });
}

/**
 * Readiness: MongoDB must be connected before traffic is routed here (e.g. Kubernetes readinessProbe).
 */
export function getHealthReady(_req: Request, res: Response): void {
  const readyState = mongoose.connection.readyState;
  const connected = readyState === mongoose.ConnectionStates.connected;
  const mongoState = mongoStateLabel(readyState);

  const body = {
    status: connected ? "ready" : "not_ready",
    service: "e-commerce-api",
    mongo: {
      readyState,
      state: mongoState,
    },
  };

  res.status(connected ? 200 : 503).json(body);
}
