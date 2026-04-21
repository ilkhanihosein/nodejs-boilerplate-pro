import { Router } from "express";
import { apiVersionHeaders } from "../../common/middlewares/api-version-headers.js";
import { authRouter } from "../../modules/auth/auth.routes.js";
import { usersRouter } from "../../modules/users/users.routes.js";
import { v1PublicEndpointRegistry } from "./v1-public.endpoints.js";

/**
 * Versioned HTTP surface: only mount routers built from `HttpEndpointRegistry` / `define*Endpoint`
 * so every route stays in the OpenAPI contract (`npm run openapi:check`). Do not attach ad-hoc
 * `router.get(...)` handlers here without registering the same path in the OpenAPI pipeline.
 */
export const apiV1Router = Router();

apiV1Router.use(apiVersionHeaders);

v1PublicEndpointRegistry.mount(apiV1Router);

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/users", usersRouter);
