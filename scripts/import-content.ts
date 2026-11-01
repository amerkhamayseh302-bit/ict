import { readFile } from "node:fs/promises";
import { z } from "zod";

const recordSchema = z.object({
  slug: z.string().min(1),
  type: z.enum(["course", "ai-tool", "resource", "opportunity", "event"]),
  title: z.string().min(1),
  titleEn: z.string().default(""),
  summary: z.string().min(1),
  summaryEn: z.string().default(""),
  category: z.string().min(1),
  categoryEn: z.string().default(""),
  url: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  tags: z.array(z.string()).default([]),
});

async function main() {
  const filename = process.argv[2];
  if (!filename) {
    console.error("Usage: pnpm exec tsx scripts/import-content.ts <records.json>");
    process.exitCode = 2;
    return;
  }

  const raw = JSON.parse(await readFile(filename, "utf8")) as unknown;
  const records = z.array(recordSchema).parse(raw);
  const slugs = records.map((record) => record.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error("Each record must have a unique slug.");

  console.log(`Validated ${records.length} record(s).`);
  console.log("Validation complete. Import the records through the configured content workflow when available.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
