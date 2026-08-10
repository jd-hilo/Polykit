import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  createApiKeyForUser,
  listApiKeysForUser,
} from "@/lib/api-keys";
import { isUserSubscribed } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keys = await listApiKeysForUser(userId);
    const hasAccess = await isUserSubscribed(userId);
    return NextResponse.json({ keys, hasAccess });
  } catch (e) {
    console.error("[api/keys GET]", e);
    return NextResponse.json(
      { error: "Failed to load API keys", keys: [] },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let name = "Default";
  try {
    const body = (await req.json()) as { name?: string };
    if (body?.name?.trim()) name = body.name.trim().slice(0, 64);
  } catch {
    /* default name */
  }

  try {
    const created = await createApiKeyForUser(userId, name);
    if (!created) {
      return NextResponse.json(
        { error: "Active subscription required to create API keys" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      id: created.id,
      name: created.name,
      prefix: created.prefix,
      key: created.raw,
    });
  } catch (e) {
    console.error("[api/keys POST]", e);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }
}
