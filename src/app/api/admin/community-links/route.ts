import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminRequired, hasAdminSession } from "@/lib/admin-auth";
import { getCommunityLinks, saveCommunityLinks } from "@/lib/community-links";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readJsonBody } from "@/lib/request-security";

export const runtime = "nodejs";

const linkSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  platform: z.enum(["whatsapp", "telegram", "other"]),
  title: z.string().trim().min(1).max(80),
  titleEn: z.string().trim().max(80).default(""),
  url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
      } catch {
        return false;
      }
    }),
});

const linksSchema = z.object({ items: z.array(linkSchema).max(50) });

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  try {
    return NextResponse.json(
      { items: await getCommunityLinks() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "تعذّر تحميل روابط المجتمعات." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-community-links", 20, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "بيانات الروابط غير صالحة أو كبيرة جدًا.");
  const parsed = linksSchema.safeParse(body.value);
  if (!parsed.success) {
    return badRequestResponse(400, "تحقق من أسماء روابط المجتمعات وعناوينها.");
  }

  const ids = parsed.data.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json(
      { error: "معرّفات روابط المجتمعات يجب أن تكون فريدة." },
      { status: 400 },
    );
  }

  try {
    await saveCommunityLinks(parsed.data.items);
    revalidatePath("/[locale]/contact", "page");
    revalidatePath("/[locale]", "layout");
    return NextResponse.json(
      { items: parsed.data.items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "تعذّر حفظ روابط المجتمعات." },
      { status: 500 },
    );
  }
}
