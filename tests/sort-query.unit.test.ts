import { describe, expect, it } from "vitest";
import {
  DEFAULT_MONGO_SORT_CREATED_AT_DESC,
  mongoSortFromSortQuery,
  parseSortToken,
  sortParamSchema,
  sortQuerySchema,
} from "../src/common/http/sort-query.js";

const userFields = ["createdAt", "updatedAt", "email", "name", "role"] as const;
const usersListQuery = sortQuerySchema(userFields);

describe("parseSortToken", () => {
  it("parses valid tokens", () => {
    expect(parseSortToken("createdAt:desc")).toEqual({ field: "createdAt", direction: "desc" });
    expect(parseSortToken(" email:asc ")).toEqual({ field: "email", direction: "asc" });
  });

  it("rejects invalid tokens", () => {
    expect(parseSortToken("createdAt")).toBeNull();
    expect(parseSortToken("createdAt:down")).toBeNull();
    expect(parseSortToken(":desc")).toBeNull();
    expect(parseSortToken("9bad:asc")).toBeNull();
  });
});

describe("sortQuerySchema", () => {
  it("accepts omitted or empty sort", () => {
    expect(usersListQuery.parse({})).toEqual({});
    expect(usersListQuery.parse({ sort: undefined })).toEqual({ sort: undefined });
    expect(usersListQuery.parse({ sort: "" })).toEqual({ sort: undefined });
    expect(usersListQuery.parse({ sort: "   " })).toEqual({ sort: undefined });
  });

  it("accepts whitelisted fields", () => {
    expect(usersListQuery.parse({ sort: "email:asc" })).toEqual({ sort: "email:asc" });
  });

  it("rejects bad format", () => {
    const r = usersListQuery.safeParse({ sort: "email-up" });
    expect(r.success).toBe(false);
  });

  it("rejects non-whitelisted fields", () => {
    const r = usersListQuery.safeParse({ sort: "passwordHash:asc" });
    expect(r.success).toBe(false);
  });
});

describe("sortParamSchema", () => {
  it("accepts syntactically valid sort token", () => {
    expect(() => sortParamSchema.parse("foo:desc")).not.toThrow();
  });
});

describe("mongoSortFromSortQuery", () => {
  it("applies default when sort missing or invalid", () => {
    expect(
      mongoSortFromSortQuery(undefined, userFields, DEFAULT_MONGO_SORT_CREATED_AT_DESC),
    ).toEqual(DEFAULT_MONGO_SORT_CREATED_AT_DESC);
    expect(mongoSortFromSortQuery("", userFields, DEFAULT_MONGO_SORT_CREATED_AT_DESC)).toEqual(
      DEFAULT_MONGO_SORT_CREATED_AT_DESC,
    );
    expect(
      mongoSortFromSortQuery("nope:asc", userFields, DEFAULT_MONGO_SORT_CREATED_AT_DESC),
    ).toEqual(DEFAULT_MONGO_SORT_CREATED_AT_DESC);
  });

  it("maps asc and desc", () => {
    expect(
      mongoSortFromSortQuery("email:asc", userFields, DEFAULT_MONGO_SORT_CREATED_AT_DESC),
    ).toEqual({
      email: 1,
    });
    expect(
      mongoSortFromSortQuery("role:desc", userFields, DEFAULT_MONGO_SORT_CREATED_AT_DESC),
    ).toEqual({
      role: -1,
    });
  });
});
