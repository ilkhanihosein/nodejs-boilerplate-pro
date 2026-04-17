import "dotenv/config";

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  throw new Error("MONGODB_URI is required for migrate-mongo");
}

function databaseNameFromUri(u) {
  const noQuery = u.split("?")[0] ?? u;
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
