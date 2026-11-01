import "server-only";

import { catalog, type CatalogItem, type CatalogType } from "@/features/catalog";
import { createAdminSupabaseClient } from "@/lib/admin-supabase";

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
  const client = createAdminSupabaseClient();
  if (!client) return seededContent;

  const { data, error } = await client
    .from("site_content_records")
    .select("id, record, is_deleted");
  if (error) throw error;

  const records = new Map(seededContent.map((item) => [item.id, item]));
  for (const row of (data ?? []) as ContentRow[]) {
    if (row.is_deleted) records.delete(row.id);
    else records.set(row.id, row.record);
  }
  return [...records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function writeContent(items: ContentRecord[]) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase server configuration is missing.");

  const { data, error } = await client.from("site_content_records").select("id, record");
  if (error) throw error;
  const previous = new Map(((data ?? []) as Array<{ id: string; record: ContentRecord }>).map((row) => [row.id, row.record]));
  const incomingIds = new Set(items.map((item) => item.id));
  const rows = items.map((record) => ({ id: record.id, record, is_deleted: false, updated_at: new Date().toISOString() }));

  // [SECURITY FIX]: Store deletions as tombstones so deleted built-in records do not reappear from the seed catalog.
  for (const base of seededContent) {
    if (!incomingIds.has(base.id)) rows.push({ id: base.id, record: base, is_deleted: true, updated_at: new Date().toISOString() });
  }
  for (const [id, record] of previous) {
    if (!incomingIds.has(id) && !seededContent.some((item) => item.id === id)) {
      rows.push({ id, record, is_deleted: true, updated_at: new Date().toISOString() });
    }
  }
  const { error: upsertError } = await client.from("site_content_records").upsert(rows, { onConflict: "id" });
  if (upsertError) throw upsertError;
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

  const client = createAdminSupabaseClient();
  if (client) {
    const { data, error } = await client.from("site_categories").select("type, name");
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.type in categories) categories[row.type as CatalogType].add(row.name as string);
    }
  }
  return Object.fromEntries(Object.entries(categories).map(([type, names]) => [type, [...names]])) as Record<CatalogType, string[]>;
}

export async function writeCategories(categories: Record<CatalogType, string[]>) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase server configuration is missing.");
  const rows = (Object.entries(categories) as Array<[CatalogType, string[]]>).flatMap(([type, names]) =>
    [...new Set(names)].map((name) => ({ type, name })),
  );
  const { error } = await client.from("site_categories").upsert(rows, { onConflict: "type,name", ignoreDuplicates: true });
  if (error) throw error;
}
