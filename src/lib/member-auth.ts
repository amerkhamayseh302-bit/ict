import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query, isDbConfigured } from "@/lib/db";
import { ensureSchema } from "@/lib/db-init";

const MEMBER_COOKIE_NAME = "ict_member_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function isMemberAuthConfigured(): boolean {
  return isDbConfigured();
}

export function memberNotConfigured() {
  return NextResponse.json(
    {
      error:
        "تسجيل الأعضاء غير مفعّل بعد. أضف إعدادات DATABASE_URL إلى ملف .env.local.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const candidateHash = hashPassword(password, salt);
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const hashBuffer = Buffer.from(hash, "hex");
    if (candidateBuffer.length !== hashBuffer.length) return false;
    return timingSafeEqual(candidateBuffer, hashBuffer);
  } catch {
    return false;
  }
}

export type MemberUser = {
  id: string;
  email: string;
  preferredLocale?: string;
  emailConfirmed?: boolean;
};

export async function getMemberUser(): Promise<MemberUser | null> {
  if (!isMemberAuthConfigured()) return null;

  try {
    await ensureSchema();
    const cookieStore = await cookies();
    const token = cookieStore.get(MEMBER_COOKIE_NAME)?.value;
    if (!token || !/^[0-9a-f]{64}$/i.test(token)) return null;

    const result = await query<{
      id: string;
      email: string;
      preferred_locale: string;
      email_confirmed_at: Date | null;
    }>(
      `SELECT m.id, m.email, m.preferred_locale, m.email_confirmed_at
       FROM members m
       JOIN member_sessions s ON s.user_id = m.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token],
    );

    const user = result.rows[0];
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      preferredLocale: user.preferred_locale,
      emailConfirmed: Boolean(user.email_confirmed_at),
    };
  } catch (error) {
    console.error("Failed to authenticate member session:", error);
    return null;
  }
}

export async function signUpMember({
  email,
  password,
  locale = "ar",
}: {
  email: string;
  password: string;
  locale?: string;
}): Promise<{ member: MemberUser }> {
  if (!isMemberAuthConfigured()) {
    throw new Error("قاعدة البيانات غير مهيأة.");
  }

  await ensureSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await query(`SELECT id FROM members WHERE email = $1`, [
    normalizedEmail,
  ]);
  if (existing.rows.length > 0) {
    throw new Error("البريد الإلكتروني مسجل مسبقًا. سجّل الدخول بدلاً من ذلك.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const now = new Date();
  const preferredLocale = locale === "en" ? "en" : "ar";

  const memberResult = await query<{ id: string; email: string }>(
    `INSERT INTO members (email, password_hash, password_salt, email_confirmed_at, preferred_locale, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING id, email`,
    [normalizedEmail, hash, salt, now.toISOString(), preferredLocale, now.toISOString()],
  );

  const member = memberResult.rows[0];

  await query(
    `INSERT INTO event_subscriptions (user_id, events_enabled, created_at, updated_at)
     VALUES ($1, false, $2, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [member.id, now.toISOString()],
  );

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await query(
    `INSERT INTO member_sessions (token, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionToken, member.id, expiresAt.toISOString(), now.toISOString()],
  );

  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });

  return {
    member: {
      id: member.id,
      email: member.email,
      preferredLocale,
      emailConfirmed: true,
    },
  };
}

export async function signInMember({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ member: MemberUser }> {
  if (!isMemberAuthConfigured()) {
    throw new Error("قاعدة البيانات غير مهيأة.");
  }

  await ensureSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
    password_salt: string;
    preferred_locale: string;
    email_confirmed_at: Date | null;
  }>(
    `SELECT id, email, password_hash, password_salt, preferred_locale, email_confirmed_at
     FROM members
     WHERE email = $1`,
    [normalizedEmail],
  );

  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    throw new Error("بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.");
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const now = new Date();

  await query(
    `INSERT INTO member_sessions (token, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionToken, user.id, expiresAt.toISOString(), now.toISOString()],
  );

  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });

  return {
    member: {
      id: user.id,
      email: user.email,
      preferredLocale: user.preferred_locale,
      emailConfirmed: Boolean(user.email_confirmed_at),
    },
  };
}

export async function signOutMember(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(MEMBER_COOKIE_NAME)?.value;
    if (token) {
      await query(`DELETE FROM member_sessions WHERE token = $1`, [token]);
    }
    cookieStore.set(MEMBER_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch (error) {
    console.error("Error signing out member:", error);
  }
}

export function clearLegacyMemberCookies(response: NextResponse) {
  for (const name of [
    "ict_member_access",
    "ict_member_refresh",
    "ict_member_expires",
    "sb-access-token",
    "sb-refresh-token",
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}
