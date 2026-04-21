import { definePublicEndpoint } from "../../common/http/define-endpoint.js";
import { HttpEndpointRegistry } from "../../common/http/http-endpoint-registry.js";
import { validationErrorResponseSchema } from "../../common/http/http-error-response.schemas.js";
import { apiV1BasePath } from "./api-path.js";
import { helloOkResponseSchema, helloQuerySchema } from "./hello.schemas.js";
import { v1IndexResponseSchema } from "./v1-index.schemas.js";
import { getHelloPayload, getV1IndexPayload } from "./v1-public.service.js";

const v1IndexEndpoint = definePublicEndpoint({
  method: "get",
  path: "/",
  tags: ["API v1"],
  summary: "API v1 index",
  responses: {
    200: {
      description: "OK",
      schema: v1IndexResponseSchema,
    },
  },
  handler: ({ json }) => {
    json(200, getV1IndexPayload());
  },
});

const helloEndpoint = definePublicEndpoint({
  method: "get",
  path: "/hello",
  tags: ["API v1"],
  summary: "Hello (validated query)",
  request: { query: helloQuerySchema },
  responses: {
    200: {
      description: "Greeting",
      schema: helloOkResponseSchema,
    },
    400: {
      description: "Validation error",
      schema: validationErrorResponseSchema,
    },
  },
  handler: ({ validated, json }) => {
    json(200, getHelloPayload(validated.query.name));
  },
});

/** Mounted on `apiV1Router` at repo root prefix (`API_V1_PREFIX`). */
const v1PublicEndpointRegistry = new HttpEndpointRegistry(apiV1BasePath());
v1PublicEndpointRegistry.add(v1IndexEndpoint);
v1PublicEndpointRegistry.add(helloEndpoint);
export { v1PublicEndpointRegistry };
