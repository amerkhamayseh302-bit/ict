import "server-only";

import { catalog, type CatalogItem, type CatalogType } from "@/features/catalog";
import { query, withTransaction, isDbConfigured } from "@/lib/db";
import { ensureSchema } from "@/lib/db-init";

export type ContentRecord = CatalogItem & {
  id: string;
  status: "published" | "draft";
  updatedAt: string;
};

const defaultCategories: Record<CatalogType, string[]> = {
  course: ["برمجة", "أمن سيبراني", "تطوير الويب", "قواعد البيانات", "شبكات"],
  "ai-tool": ["كتابة", "تصميم", "توليد الصور", "توليد الفيديو", "إنتاجية"],
  resource: ["برمجة", "أمن سيبراني", "ذكاء اصطناعي", "تصميم", "عام"],
  opportunity: ["وظائف", "تدريب", "منح", "تطوع"],
  event: ["ورش عمل", "لقاءات", "هاكاثون", "ندوات"],
};

const seededContent: ContentRecord[] = catalog.map((item) => ({
  ...item,
  id: item.slug,
  status: "published",
  updatedAt: "2026-10-25",
}));

type ContentRow = { id: string; record: ContentRecord; is_deleted: boolean };

export async function readContent(): Promise<ContentRecord[]> {
  if (!isDbConfigured()) return seededContent;

  try {
    await ensureSchema();
    const result = await query<ContentRow>(
      `SELECT id, record, is_deleted FROM site_content_records`,
    );

    const records = new Map(seededContent.map((item) => [item.id, item]));
    for (const row of result.rows) {
      if (row.is_deleted) {
        records.delete(row.id);
      } else {
        records.set(row.id, row.record);
      }
    }
    return [...records.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  } catch (error) {
    console.error("Failed to read content from PostgreSQL:", error);
    return seededContent;
  }
}

export async function writeContent(items: ContentRecord[]) {
  if (!isDbConfigured()) {
    throw new Error("إعدادات قاعدة بيانات PostgreSQL غير مكتملة.");
  }

  await ensureSchema();

  await withTransaction(async (client) => {
    const existingResult = await client.query<{ id: string; record: ContentRecord }>(
      `SELECT id, record FROM site_content_records`,
    );
    const previous = new Map(
      existingResult.rows.map((row) => [row.id, row.record]),
    );

    const incomingIds = new Set(items.map((item) => item.id));
    const now = new Date().toISOString();

    const rows: Array<{
      id: string;
      record: ContentRecord;
      is_deleted: boolean;
      updated_at: string;
    }> = items.map((record) => ({
      id: record.id,
      record,
      is_deleted: false,
      updated_at: now,
    }));

    // Tombstones for seeded content removed by admin
    for (const base of seededContent) {
      if (!incomingIds.has(base.id)) {
        rows.push({ id: base.id, record: base, is_deleted: true, updated_at: now });
      }
    }

    // Tombstones for previously stored records removed by admin
    for (const [id, record] of previous) {
      if (!incomingIds.has(id) && !seededContent.some((item) => item.id === id)) {
        rows.push({ id, record, is_deleted: true, updated_at: now });
      }
    }

    for (const row of rows) {
      await client.query(
        `INSERT INTO site_content_records (id, record, is_deleted, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
         SET record = EXCLUDED.record,
             is_deleted = EXCLUDED.is_deleted,
             updated_at = EXCLUDED.updated_at`,
        [row.id, JSON.stringify(row.record), row.is_deleted, row.updated_at],
      );
    }
  });
}

export async function readCategories(): Promise<Record<CatalogType, string[]>> {
  const categories = Object.fromEntries(
    (Object.keys(defaultCategories) as CatalogType[]).map((type) => [
      type,
      new Set([
        ...(defaultCategories[type] ?? []),
        ...catalog.filter((item) => item.type === type).map((item) => item.category),
      ]),
    ]),
  ) as Record<CatalogType, Set<string>>;

  if (isDbConfigured()) {
    try {
      await ensureSchema();
      const result = await query<{ type: string; name: string }>(
        `SELECT type, name FROM site_categories`,
      );
      for (const row of result.rows) {
        if (row.type in categories) {
          categories[row.type as CatalogType].add(row.name);
        }
      }
    } catch (error) {
      console.error("Failed to read categories from PostgreSQL:", error);
    }
  }

  return Object.fromEntries(
    Object.entries(categories).map(([type, names]) => [type, [...names]]),
  ) as Record<CatalogType, string[]>;
}

export async function writeCategories(categories: Record<CatalogType, string[]>) {
  if (!isDbConfigured()) {
    throw new Error("إعدادات قاعدة بيانات PostgreSQL غير مكتملة.");
  }

  await ensureSchema();

  await withTransaction(async (client) => {
    for (const [type, names] of Object.entries(categories)) {
      for (const name of new Set(names)) {
        await client.query(
          `INSERT INTO site_categories (type, name)
           VALUES ($1, $2)
           ON CONFLICT (type, name) DO NOTHING`,
          [type, name],
        );
      }
    }
  });
}
