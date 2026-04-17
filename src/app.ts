import cors from "cors";
import express from "express";
import helmet from "helmet";
import { apiV1Router } from "./api/v1/routes.js";
import { bindRequestContext } from "./common/middlewares/bind-request-context.js";
import { errorHandler } from "./common/middlewares/error-handler.js";
import { httpLogger, requestLifecycleLogger } from "./common/middlewares/http-logger.js";
import { httpRateLimiter } from "./common/middlewares/http-rate-limit.js";
import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: env.corsCredentials,
    }),
  );
  app.use(bindRequestContext);
  app.use(httpLogger);
  app.use(requestLifecycleLogger);
  app.use(httpRateLimiter);
  app.use(express.json({ limit: env.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));

  app.use("/health", healthRouter);
  app.use(env.apiV1Prefix, apiV1Router);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  app.use(errorHandler);

  return app;
}
