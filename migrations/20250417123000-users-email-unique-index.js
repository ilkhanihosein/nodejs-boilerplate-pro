/**
 * Example schema-level index for future `users` collection.
 *
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} _client
 */
export const up = async (db, _client) => {
  await db
    .collection("users")
    .createIndex({ email: 1 }, { unique: true, name: "users_email_1_unique" });
};

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} _client
 */
export const down = async (db, _client) => {
  try {
    await db.collection("users").dropIndex("users_email_1_unique");
  } catch {
    // index or collection may not exist
  }
};
