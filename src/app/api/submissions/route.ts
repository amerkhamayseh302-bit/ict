import { NextResponse } from "next/server";

// Public intake stays closed until a moderated storage destination is configured.
export async function POST() {
  return NextResponse.json(
    { message: "Submissions are not open yet. Please contact the ICT Community team." },
    { status: 503 },
  );
}
