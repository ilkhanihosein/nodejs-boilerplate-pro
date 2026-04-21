import { describe, expect, it } from "vitest";
import { buildOpenApiV1Document } from "../src/api/v1/openapi.js";
import { listMountedContractOperations } from "../src/api/v1/list-contract-operations.js";
import { enforceStrictOpenApiContract } from "../src/common/http/openapi-contract-strict.js";

describe("enforceStrictOpenApiContract", () => {
  it("passes for the live registry + OpenAPI document", () => {
    const doc = buildOpenApiV1Document();
    const mounted = listMountedContractOperations();
    expect(enforceStrictOpenApiContract(mounted, doc)).toEqual([]);
  });
});
