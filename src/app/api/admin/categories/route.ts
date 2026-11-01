import { NextRequest, NextResponse } from "next/server";
import { adminRequired, hasAdminSession } from "@/lib/admin-auth";
import { readCategories, writeCategories } from "@/lib/local-content";
import { z } from "zod";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readJsonBody } from "@/lib/request-security";

export const runtime = "nodejs";

const types = ["course", "ai-tool", "resource", "opportunity", "event"] as const;

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  try {
    return NextResponse.json({ categories: await readCategories() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذّر تحميل الفروع." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-category-write", 40, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const body = await readJsonBody(request, 4 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "بيانات الفرع غير صالحة.");
  const parsed = z.object({ type: z.enum(types), name: z.string().trim().min(1).max(80) }).safeParse(body.value);
  if (!parsed.success) return badRequestResponse(400, "اختر قسمًا واكتب اسم فرع صحيحًا.");
  try {
    const { type, name } = parsed.data;
    const categories = await readCategories();
    const branches = [...new Set([...categories[type], name])];
    if (branches.length > 100) return badRequestResponse(400, "وصل القسم إلى الحد الأقصى للفروع.");
    const updated = { ...categories, [type]: branches };
    await writeCategories(updated);
    return NextResponse.json({ categories: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذّر حفظ الفرع." }, { status: 500 });
  }
}
