import { Pool } from "pg";

export const db = new Pool({
  host: process.env.POSTGRES_HOST || "db",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || "postgres",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
});

db.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});
