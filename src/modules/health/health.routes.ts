import { Router } from "express";
import { healthEndpointRegistry } from "./health.endpoints.js";

export const healthRouter = Router();

healthEndpointRegistry.mount(healthRouter);
