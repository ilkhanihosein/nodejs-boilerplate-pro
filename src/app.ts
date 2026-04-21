import "./config/zod-openapi-init.js";
import type { Store } from "express-rate-limit";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { apiV1Router } from "./api/v1/routes.js";
import { buildOpenApiV1Document } from "./api/v1/openapi.js";
import { httpMetricsMiddleware } from "./common/http/middleware/metrics.middleware.js";
import { bindRequestContext } from "./common/middlewares/bind-request-context.js";
import { errorHandler } from "./common/middlewares/error-handler.js";
import { httpLogger, requestLifecycleLogger } from "./common/middlewares/http-logger.js";
import { createHttpRateLimiter } from "./common/middlewares/http-rate-limit.js";
import { env } from "./config/env.js";
import { registerPrometheusMetricsRoute } from "./observability/metrics.js";
import { healthRouter } from "./modules/health/health.routes.js";

export type CreateAppOptions = {
  /** When set, HTTP rate limits are counted in Redis (safe behind multiple replicas). */
  rateLimitStore?: Store;
};

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  const httpRateLimiter = createHttpRateLimiter(options.rateLimitStore);

  app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");
  registerPrometheusMetricsRoute(app);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      ...(env.apiDocsEnabled
        ? {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                workerSrc: ["'self'", "blob:"],
              },
            },
          }
        : {}),
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: env.corsCredentials,
    }),
  );
  app.use(bindRequestContext);
  if (env.observabilityMetricsEnabled) {
    app.use(httpMetricsMiddleware);
  }
  app.use(httpLogger);
  app.use(requestLifecycleLogger);
  app.use(httpRateLimiter);
  app.use(express.json({ limit: env.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));

  app.use("/health", healthRouter);
  app.use(env.apiV1Prefix, apiV1Router);

  if (env.apiDocsEnabled) {
    const openApiSpec = buildOpenApiV1Document();
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  }

  app.use((req, res) => {
    const underApi = req.path === env.apiV1Prefix || req.path.startsWith(`${env.apiV1Prefix}/`);
    res
      .status(404)
      .json(
        underApi
          ? { error: "Not Found", code: "not_found", apiVersion: env.apiVersion }
          : { error: "Not Found", code: "not_found" },
      );
  });

  app.use(errorHandler);

  return app;
}
