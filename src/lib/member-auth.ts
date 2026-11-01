import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function createMemberSupabaseClient() {
  const config = supabaseConfig();
  if (!config) {
    throw new Error("تسجيل الأعضاء غير مفعّل بعد. أضف إعدادات Supabase إلى .env.local.");
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie writes are unavailable in Server Components; Route Handlers can write them.
        }
      },
    },
  });
}

export function memberNotConfigured() {
  return Response.json(
    { error: "تسجيل الأعضاء غير مفعّل بعد. أضف إعدادات Supabase إلى ملف .env.local." },
    { status: 503 },
  );
}

export function clearLegacyMemberCookies(response: NextResponse) {
  for (const name of [
    "ict_member_access",
    "ict_member_refresh",
    "ict_member_expires",
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
