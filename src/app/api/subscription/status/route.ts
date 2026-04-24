import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isUserSubscribed } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  const hasAccess = await isUserSubscribed(userId ?? null);
  return NextResponse.json({ hasAccess });
}
