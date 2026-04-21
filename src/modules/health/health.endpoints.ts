import { definePublicEndpoint } from "../../common/http/define-endpoint.js";
import { HttpEndpointRegistry } from "../../common/http/http-endpoint-registry.js";
import { healthLivenessResponseSchema, healthReadyResponseSchema } from "./health.schemas.js";
import { getHealthLivenessPayload, getHealthReadinessResult } from "./health.service.js";

const healthLivenessEndpoint = definePublicEndpoint({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Liveness",
  responses: {
    200: {
      description: "Process is up",
      schema: healthLivenessResponseSchema,
    },
  },
  handler: ({ json }) => {
    json(200, getHealthLivenessPayload());
  },
});

const healthReadyEndpoint = definePublicEndpoint({
  method: "get",
  path: "/ready",
  tags: ["Health"],
  summary: "Readiness (MongoDB connected)",
  responses: {
    200: {
      description: "Ready",
      schema: healthReadyResponseSchema,
    },
    503: {
      description: "Not ready",
      schema: healthReadyResponseSchema,
    },
  },
  handler: ({ json }) => {
    const { httpStatus, body } = getHealthReadinessResult();
    if (httpStatus === 200) {
      json(200, body);
    } else {
      json(503, body);
    }
  },
});

const healthEndpointRegistry = new HttpEndpointRegistry("/health");
healthEndpointRegistry.add(healthLivenessEndpoint);
healthEndpointRegistry.add(healthReadyEndpoint);
export { healthEndpointRegistry };
