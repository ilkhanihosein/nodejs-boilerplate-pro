import { Router } from "express";
import { usersEndpointRegistry } from "./users.endpoints.js";

export const usersRouter = Router();

usersEndpointRegistry.mount(usersRouter);
