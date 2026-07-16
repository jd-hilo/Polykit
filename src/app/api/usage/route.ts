import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listUsageForUser } from "@/lib/api-keys";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const calls = await listUsageForUser(userId);
    return NextResponse.json({ calls });
  } catch (e) {
    console.error("[api/usage GET]", e);
    return NextResponse.json(
      { error: "Failed to load usage", calls: [] },
      { status: 500 },
    );
  }
}
