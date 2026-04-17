import { Router } from "express";
import { getHealth, getHealthReady } from "./health.controller.js";

export const healthRouter = Router();

healthRouter.get("/", getHealth);
healthRouter.get("/ready", getHealthReady);
