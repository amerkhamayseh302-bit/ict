import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ict_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

export function isAdminConfigured() {
  return Boolean(
    process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_PASSWORD.length >= 8 &&
      process.env.ADMIN_SESSION_SECRET &&
      process.env.ADMIN_SESSION_SECRET.length >= 32,
  );
}

export function passwordMatches(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || !candidate || candidate.length > 256) return false;
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function hasAdminSession(request: NextRequest) {
  if (!isAdminConfigured()) return false;
  const [expires, nonce, suppliedSignature] = request.cookies.get(COOKIE_NAME)?.value.split(".") ?? [];
  if (
    !expires ||
    !/^\d{13}$/.test(expires) ||
    !nonce ||
    !/^[A-Za-z0-9_-]{20,}$/.test(nonce) ||
    !suppliedSignature ||
    Number(expires) < Date.now() ||
    Number(expires) > Date.now() + SESSION_SECONDS * 1000
  ) return false;
  const payload = `${expires}.${nonce}`;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function setAdminSession(response: NextResponse) {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  const nonce = randomBytes(18).toString("base64url");
  const payload = `${expires}.${nonce}`;
  response.cookies.set(COOKIE_NAME, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function adminRequired() {
  return NextResponse.json({ error: "سجّل الدخول لإدارة الموقع." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
