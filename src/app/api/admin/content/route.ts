import { NextRequest, NextResponse } from "next/server";
import { adminRequired, hasAdminSession } from "@/lib/admin-auth";
import { readContent, writeContent, type ContentRecord } from "@/lib/local-content";
import type { CatalogType } from "@/features/catalog";
import { z } from "zod";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readJsonBody } from "@/lib/request-security";

export const runtime = "nodejs";

const contentTypes: CatalogType[] = ["course", "ai-tool", "resource", "opportunity", "event"];
const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const cleanHeaderText = (maximum: number) => z.string().trim().max(maximum).refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const httpUrl = z.string().trim().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
});
const contentSchema = z.object({
  id: idSchema,
  slug: idSchema,
  type: z.enum(contentTypes),
  title: cleanHeaderText(200).pipe(z.string().min(1)),
  titleEn: cleanHeaderText(200).default(""),
  summary: z.string().trim().min(1).max(3000),
  summaryEn: z.string().trim().max(3000).default(""),
  category: z.string().trim().min(1).max(100),
  categoryEn: z.string().trim().max(100).default(""),
  url: httpUrl,
  label: z.string().trim().max(120).optional(),
  labelEn: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  status: z.enum(["draft", "published"]),
  imageUrl: z.string().trim().max(2048).optional().refine((value) => {
    if (!value) return true;
    if (/^\/api\/media\/[0-9a-f-]{36}$/i.test(value)) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }),
  startAt: z.union([z.literal(""), z.string().datetime()]).optional(),
});

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  try {
    return NextResponse.json({ items: await readContent() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذّر قراءة المحتوى." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-content-write", 60, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const body = await readJsonBody(request, 32 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "بيانات المحتوى غير صالحة أو كبيرة جدًا.");
  const parsed = contentSchema.safeParse(body.value);
  if (!parsed.success) return badRequestResponse(400, "تحقق من الحقول وروابط المحتوى.");
  try {
    const value = parsed.data;
    const items = await readContent();
    const existing = items.find((item) => item.id === value.id);
    if (!existing && items.length >= 2000) return badRequestResponse(400, "وصل الموقع إلى الحد الحالي للعناصر.");
    const record: ContentRecord = {
      id: value.id,
      slug: existing?.slug ?? value.slug,
      type: value.type as CatalogType,
      title: value.title, titleEn: value.titleEn,
      summary: value.summary, summaryEn: value.summaryEn,
      category: value.category, categoryEn: value.categoryEn,
      url: value.url,
      label: value.label, labelEn: value.labelEn,
      tags: value.tags ?? [],
      status: value.status,
      updatedAt: new Date().toISOString(),
      imageUrl: value.imageUrl,
      startAt: value.startAt ? new Date(value.startAt).toISOString() : undefined,
    };
    await writeContent(existing ? items.map((item) => item.id === record.id ? record : item) : [record, ...items]);
    return NextResponse.json({ item: record }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذّر حفظ المحتوى." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !idSchema.safeParse(id).success) return badRequestResponse(400, "معرّف المحتوى غير صالح.");
  try {
    const items = await readContent();
    if (!items.some((item) => item.id === id)) return NextResponse.json({ error: "المحتوى غير موجود." }, { status: 404 });
    await writeContent(items.filter((item) => item.id !== id));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذّر حذف المحتوى." }, { status: 500 });
  }
}
