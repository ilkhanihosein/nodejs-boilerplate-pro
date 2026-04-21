import { env } from "../../config/env.js";
import type { HelloOkResponse } from "./hello.schemas.js";
import type { V1IndexResponse } from "./v1-index.schemas.js";

export function getV1IndexPayload(): V1IndexResponse {
  return {
    ok: true,
    api: env.apiV1Prefix,
    apiVersion: env.apiVersion,
    message: "Mount feature routers here (e.g. apiV1Router.use('/users', usersRouter)).",
  };
}

export function getHelloPayload(name: string): HelloOkResponse {
  return {
    message: `Hello, ${name}`,
    apiVersion: env.apiVersion,
  };
}
