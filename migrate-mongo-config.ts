import { env } from "./src/config/env.js";

function databaseNameFromUri(uri: string): string {
  const noQuery = uri.split("?")[0] ?? uri;
  const idx = noQuery.lastIndexOf("/");
  if (idx === -1 || idx === noQuery.length - 1) {
    throw new Error(
      "MONGODB_URI must include a database path (e.g. mongodb://host:27017/ecommerce)",
    );
  }
  const name = decodeURIComponent(noQuery.slice(idx + 1));
  if (!name || name.includes("@")) {
    throw new Error("Could not parse database name from MONGODB_URI");
  }
  return name;
}

const uri = env.mongodbUri;

const config = {
  mongodb: {
    url: uri,
    databaseName: databaseNameFromUri(uri),
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "migration_changelog",
  lockCollectionName: "migration_changelog_lock",
  lockTtl: 0,
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "esm",
};

export default config;
