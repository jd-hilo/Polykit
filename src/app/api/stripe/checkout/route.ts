import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL;
  if (!url) {
    return NextResponse.json({ error: "Checkout not configured" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
