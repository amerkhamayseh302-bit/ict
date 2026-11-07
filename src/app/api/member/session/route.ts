import { NextResponse } from "next/server";
import {
  clearLegacyMemberCookies,
  getMemberUser,
  isMemberAuthConfigured,
  memberNotConfigured,
} from "@/lib/member-auth";

export async function GET() {
  if (!isMemberAuthConfigured()) return memberNotConfigured();
  const user = await getMemberUser();
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
