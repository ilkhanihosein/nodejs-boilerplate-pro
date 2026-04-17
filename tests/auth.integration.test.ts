import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { connectMongo, disconnectMongo } from "../src/config/database.js";
import { RefreshTokenSessionModel } from "../src/modules/auth/refresh-token.model.js";
import { UserModel } from "../src/modules/users/user.model.js";

describe("auth integration", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectMongo(mongoServer.getUri());
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), RefreshTokenSessionModel.deleteMany({})]);
  });

  it("rotates refresh token, rejects reused token, and revokes on logout", async () => {
    const app = createApp();
    const email = "auth-test@example.com";
    const password = "Str0ngPassw0rd!";

    const registerRes = await request(app)
      .post(`${env.apiV1Prefix}/auth/register`)
      .send({ name: "Auth Test", email, password })
      .expect(201);

    const firstRefreshToken: string = registerRes.body.refreshToken;
    expect(typeof firstRefreshToken).toBe("string");

    const loginRes = await request(app)
      .post(`${env.apiV1Prefix}/auth/login`)
      .send({ email, password })
      .expect(200);

    const loginRefreshToken: string = loginRes.body.refreshToken;
    const accessToken: string = loginRes.body.accessToken;
    expect(loginRefreshToken).not.toBe(firstRefreshToken);

    await request(app)
      .get(`${env.apiV1Prefix}/auth/me`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const firstRefreshRes = await request(app)
      .post(`${env.apiV1Prefix}/auth/refresh`)
      .send({ refreshToken: loginRefreshToken })
      .expect(200);

    const rotatedRefreshToken: string = firstRefreshRes.body.refreshToken;
    expect(rotatedRefreshToken).not.toBe(loginRefreshToken);

    await request(app)
      .post(`${env.apiV1Prefix}/auth/refresh`)
      .send({ refreshToken: loginRefreshToken })
      .expect(401);

    await request(app)
      .post(`${env.apiV1Prefix}/auth/logout`)
      .send({ refreshToken: rotatedRefreshToken })
      .expect(200);

    await request(app)
      .post(`${env.apiV1Prefix}/auth/refresh`)
      .send({ refreshToken: rotatedRefreshToken })
      .expect(401);
  });
});
