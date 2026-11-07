import fs from "node:fs";
import path from "node:path";

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { query, isDbConfigured } from "../src/lib/db";
import { ensureSchema } from "../src/lib/db-init";

async function main() {
  if (!isDbConfigured()) {
    console.error("DATABASE_URL is not set in environment or .env.local.");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL and applying schema...");
  await ensureSchema();

  const res = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log("PostgreSQL schema successfully initialized!");
  console.log("Tables in public schema:");
  for (const row of res.rows) {
    console.log(` - ${row.table_name}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
