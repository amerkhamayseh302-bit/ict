import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

type LimitBucket = { count: number; resetAt: number };
const limitBuckets = new Map<string, LimitBucket>();

export function isSameOriginMutation(request: Request) {
  // [SECURITY FIX]: Require browser Origin validation for cookie-authenticated writes.
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || fetchSite === "cross-site") return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function clientKey(request: Request, scope: string) {
  // [SECURITY FIX]: Only use the single IP field set by a trusted reverse proxy; never persist raw IP addresses.
  const candidate = request.headers.get("x-real-ip")?.trim() || "";
  const address = isIP(candidate) ? candidate : "unknown";
  const digest = createHash("sha256").update(address).digest("hex").slice(0, 32);
  return `${scope}:${digest}`;
}

export function consumeRateLimit(
  request: Request,
  scope: string,
  maximum: number,
  windowMs: number,
) {
  const now = Date.now();
  const key = clientKey(request, scope);
  let bucket = limitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    limitBuckets.set(key, bucket);
  }

  if (limitBuckets.size > 10_000) {
    for (const [storedKey, storedBucket] of limitBuckets) {
      if (storedBucket.resetAt <= now) limitBuckets.delete(storedKey);
      if (limitBuckets.size <= 8_000) break;
    }
    // Bound memory even if a misconfigured proxy supplies many unique addresses.
    while (limitBuckets.size > 10_000) {
      const oldestKey = limitBuckets.keys().next().value;
      if (!oldestKey) break;
      limitBuckets.delete(oldestKey);
    }
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= maximum,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "وصلت إلى الحد المؤقت للطلبات. حاول مرة أخرى لاحقًا." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

async function readLimitedBytes(request: Request, maximumBytes: number) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { ok: false as const, status: 413 };
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false as const, status: 400 };

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        return { ok: false as const, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false as const, status: 400 };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true as const, bytes };
}

export async function readJsonBody(request: Request, maximumBytes = 32 * 1024) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { ok: false as const, status: 415 };
  }
  const body = await readLimitedBytes(request, maximumBytes);
  if (!body.ok) return body;

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body.bytes);
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const, status: 400 };
  }
}

export async function readFormDataBody(request: Request, maximumBytes: number) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return { ok: false as const, status: 415 };
  }
  const body = await readLimitedBytes(request, maximumBytes);
  if (!body.ok) return body;

  try {
    const response = new Response(body.bytes, { headers: { "Content-Type": contentType } });
    return { ok: true as const, value: await response.formData() };
  } catch {
    return { ok: false as const, status: 400 };
  }
}

export function badRequestResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
