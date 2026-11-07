import { NextResponse } from "next/server";
import { readMediaFile } from "@/lib/local-media";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/media/[id]">) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });
  try {
    const image = await readMediaFile(id);
    if (!image) return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });
    return new Response(Buffer.from(image.bytes), { headers: {
      "Content-Type": image.record.type,
      "Content-Length": String(image.bytes.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(image.record.name)}`,
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    } });
  } catch {
    return NextResponse.json({ error: "تعذّر قراءة الصورة." }, { status: 500 });
  }
}
