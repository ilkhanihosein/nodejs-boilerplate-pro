import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { connectMongo, disconnectMongo } from "../src/config/database.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshTokenSessionModel } from "../src/modules/auth/refresh-token.model.js";
import { UserModel } from "../src/modules/users/user.model.js";

describe("users list integration", () => {
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

  it("returns paginated users with total for admin", async () => {
    const app = createApp();
    const adminPassword = "AdminStr0ng!Pass";

    await UserModel.create({
      name: "List Admin",
      email: "list-admin@example.com",
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
    });

    for (let i = 0; i < 5; i += 1) {
      await UserModel.create({
        name: `User ${i}`,
        email: `user-${i}@example.com`,
        passwordHash: await hashPassword("Cust0mer!Pass"),
        role: "customer",
      });
    }

    const loginRes = await request(app)
      .post(`${env.apiV1Prefix}/auth/login`)
      .send({ email: "list-admin@example.com", password: adminPassword })
      .expect(200);

    const token: string = loginRes.body.accessToken;

    const page1 = await request(app)
      .get(`${env.apiV1Prefix}/users`)
      .query({ page: 1, limit: 2 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(page1.body).toMatchObject({
      page: 1,
      limit: 2,
      total: 6,
    });
    expect(Array.isArray(page1.body.items)).toBe(true);
    expect(page1.body.items).toHaveLength(2);

    const page2 = await request(app)
      .get(`${env.apiV1Prefix}/users`)
      .query({ page: 2, limit: 2 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(page2.body).toMatchObject({
      page: 2,
      limit: 2,
      total: 6,
    });
    expect(page2.body.items).toHaveLength(2);

    const page4 = await request(app)
      .get(`${env.apiV1Prefix}/users`)
      .query({ page: 4, limit: 2 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(page4.body.items).toHaveLength(0);
    expect(page4.body.total).toBe(6);
  });
});
