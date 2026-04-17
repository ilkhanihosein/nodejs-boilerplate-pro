import { Router } from "express";
import { requireAuth } from "../../common/middlewares/auth.js";
import { validateRequest } from "../../common/middlewares/validate-request.js";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from "./auth.controller.js";
import { loginBodySchema, refreshBodySchema, registerBodySchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/register", validateRequest({ body: registerBodySchema }), registerHandler);
authRouter.post("/login", validateRequest({ body: loginBodySchema }), loginHandler);
authRouter.post("/refresh", validateRequest({ body: refreshBodySchema }), refreshHandler);
authRouter.post("/logout", validateRequest({ body: refreshBodySchema }), logoutHandler);
authRouter.get("/me", requireAuth, meHandler);
