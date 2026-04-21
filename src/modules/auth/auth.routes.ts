import { Router } from "express";
import { authEndpointRegistry } from "./auth.endpoints.js";

export const authRouter = Router();

authEndpointRegistry.mount(authRouter);
