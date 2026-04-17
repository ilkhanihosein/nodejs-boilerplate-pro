import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../common/middlewares/validate-request.js";
import { env } from "../../config/env.js";
import { authRouter } from "../../modules/auth/auth.routes.js";
import { usersRouter } from "../../modules/users/users.routes.js";

const helloQuerySchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const apiV1Router = Router();

apiV1Router.get("/", (_req, res) => {
  res.json({
    ok: true,
    api: env.apiV1Prefix,
    message: "Mount feature routers here (e.g. apiV1Router.use('/users', usersRouter)).",
  });
});

apiV1Router.get("/hello", validateRequest({ query: helloQuerySchema }), (req, res) => {
  const parsed = req.validated?.query;
  if (parsed === undefined) {
    res.status(500).json({ error: "Missing validated query", code: "internal_error" });
    return;
  }
  const { name } = parsed as z.infer<typeof helloQuerySchema>;
  res.json({ message: `Hello, ${name}` });
});

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/users", usersRouter);
