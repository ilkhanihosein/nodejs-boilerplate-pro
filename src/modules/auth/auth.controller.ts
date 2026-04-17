import type { RequestHandler } from "express";
import { requireValidatedBody } from "../../common/middlewares/validate-request.js";
import { loginUser, logoutSession, refreshSessionTokens, registerUser } from "./auth.service.js";
import type { LoginBody, RefreshBody, RegisterBody } from "./auth.schemas.js";

export const registerHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody(req) as RegisterBody;
    const result = await registerUser(body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const loginHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody(req) as LoginBody;
    const result = await loginUser(body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const refreshHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody(req) as RefreshBody;
    const result = await refreshSessionTokens(body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const logoutHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireValidatedBody(req) as RefreshBody;
    await logoutSession(body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const meHandler: RequestHandler = (req, res) => {
  res.json({ user: req.authUser });
};
