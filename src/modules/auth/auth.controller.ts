import type { RequestHandler } from "express";
import type { z } from "zod";
import { requireValidatedBody } from "../../common/middlewares/validate-request.js";
import { loginUser, logoutSession, refreshSessionTokens, registerUser } from "./auth.service.js";
import { loginBodySchema, refreshBodySchema, registerBodySchema } from "./auth.schemas.js";

export const registerHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody<z.infer<typeof registerBodySchema>>(req);
    const result = await registerUser(body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const loginHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody<z.infer<typeof loginBodySchema>>(req);
    const result = await loginUser(body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const refreshHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody<z.infer<typeof refreshBodySchema>>(req);
    const result = await refreshSessionTokens(body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const logoutHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody<z.infer<typeof refreshBodySchema>>(req);
    await logoutSession(body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const meHandler: RequestHandler = (req, res) => {
  res.json({ user: req.authUser });
};
