import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

/** Run once before routes or OpenAPI code use `.openapi()` on Zod types. */
extendZodWithOpenApi(z);
