import { NextRequest, NextResponse } from "next/server";
import { adminRequired, hasAdminSession } from "@/lib/admin-auth";
import { deleteMedia, inspectImageFile, listMedia, storeMedia } from "@/lib/local-media";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readFormDataBody } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  try {
    const items = (await listMedia()).map((item) => ({ ...item, url: `/api/media/${item.id}` }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذّر تحميل الصور." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-media-upload", 10, 10 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  try {
    const form = await readFormDataBody(request, 27 * 1024 * 1024);
    if (!form.ok) return badRequestResponse(form.status, "بيانات رفع الصور غير صالحة أو كبيرة جدًا.");
    const entries = form.value.getAll("files");
    if (!entries.length || entries.length > 5 || entries.some((entry) => !(entry instanceof File))) {
      return badRequestResponse(400, "ارفع من صورة واحدة إلى خمس صور في المرة الواحدة.");
    }
    const files = entries as File[];
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    if (files.some((file) => file.size <= 0 || file.size > 8 * 1024 * 1024) || totalSize > 25 * 1024 * 1024) {
      return badRequestResponse(413, "الحد الأقصى للصورة 8 ميغابايت، وللرفع الواحد 25 ميغابايت.");
    }
    const verified = await Promise.all(files.map(inspectImageFile));
    if (verified.some((image) => image === null)) {
      return badRequestResponse(415, "صيغة الصورة غير مدعومة. استخدم PNG أو JPEG أو GIF أو WebP أو BMP أو TIFF أو AVIF.");
    }
    const items = [];
    for (const [index, file] of files.entries()) {
      const image = verified[index];
      if (image) items.push(await storeMedia(file, image));
    }
    return NextResponse.json({ items: items.map((item) => ({ ...item, url: `/api/media/${item.id}` })) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذّر حفظ الصور على الخادم." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-media-delete", 30, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "معرّف الصورة غير صالح." }, { status: 400 });
  try {
    const deleted = await deleteMedia(id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "تعذّر حذف الصورة." }, { status: 500 });
  }
}
