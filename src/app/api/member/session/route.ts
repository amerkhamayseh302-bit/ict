import { NextResponse } from "next/server";
import {
  clearLegacyMemberCookies,
  createMemberSupabaseClient,
  memberNotConfigured,
  supabaseConfig,
} from "@/lib/member-auth";

export async function GET() {
  if (!supabaseConfig()) return memberNotConfigured();
  const supabase = await createMemberSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  const response = NextResponse.json(
    {
      authenticated: Boolean(user),
      member: user ? { id: user.id, email: user.email } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearLegacyMemberCookies(response);
  return response;
}
