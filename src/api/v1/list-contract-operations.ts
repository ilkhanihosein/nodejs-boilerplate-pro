import type { ListedContractOperation } from "../../common/http/openapi-contract-strict.js";
import { httpContractRegistries } from "./contract-registries.js";

/** Operations from {@link httpContractRegistries} (same order as OpenAPI contribution). */
export function listMountedContractOperations(): ListedContractOperation[] {
  return httpContractRegistries.flatMap((r) => [...r.listOperations()]);
}
