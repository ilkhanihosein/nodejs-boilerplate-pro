import "dotenv/config";
import mongoose from "mongoose";
import { logger } from "../common/logger.js";
import { connectMongo, disconnectMongo } from "../config/database.js";
import { env } from "../config/env.js";

/**
 * Idempotent reference data for local/dev. Safe to re-run (upserts by `slug`).
 */
async function seedCategories(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB is not connected");
  }

  const col = db.collection("categories");
  const now = new Date();

  const defaults = [
    { slug: "uncategorized", name: "Uncategorized" },
    { slug: "electronics", name: "Electronics" },
    { slug: "books", name: "Books" },
  ];

  await col.bulkWrite(
    defaults.map((doc) => ({
      updateOne: {
        filter: { slug: doc.slug },
        update: {
          $set: { name: doc.name, updatedAt: now },
          $setOnInsert: { slug: doc.slug, createdAt: now },
        },
        upsert: true,
      },
    })),
  );
}

async function main(): Promise<void> {
  await connectMongo(env.mongodbUri);
  await seedCategories();
  logger.info("seed_completed_categories");
  await disconnectMongo();
}

void main().catch((err: unknown) => {
  logger.fatal({ err }, "seed_failed");
  process.exit(1);
});
