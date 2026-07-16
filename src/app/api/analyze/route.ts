// POST /api/analyze — Clerk-authenticated analyzer (debug / legacy web UI).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  dataUrlFromBase64,
  parseEffort,
  runAnalyze,
  type AnalyzeInput,
} from "@/lib/analyze-pipeline";
import { slugFromUrl } from "@/lib/polymarket";
import type { AnalyzerResponse } from "@/lib/analyzer";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function json(body: AnalyzerResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzerResponse>> {
  const { userId } = await auth();
  if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, error: "Invalid form data" }, 400);
  }

  const image = form.get("image");
  const contextRaw = form.get("context");
  const userContext =
    typeof contextRaw === "string" && contextRaw.trim().length > 0 ? contextRaw.trim() : null;
  const effort = parseEffort(form.get("reasoning_effort"));

  const slugRaw = form.get("slug");
  const urlRaw = form.get("url");

  const input: AnalyzeInput = {
    context: userContext,
    reasoning_effort: effort,
  };

  const isBlob =
    typeof image === "object" &&
    image !== null &&
    typeof (image as Blob).arrayBuffer === "function" &&
    typeof (image as Blob).size === "number";

  if (isBlob && (image as Blob).size > 0) {
    const blob = image as Blob;
    if (blob.size > MAX_BYTES) {
      return json({ ok: false, error: "Image is larger than 8MB" }, 413);
    }
    const mime = (blob.type || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return json({ ok: false, error: "Only PNG, JPG, or WEBP images are supported" }, 415);
    }
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const b64 = Buffer.from(bytes).toString("base64");
      input.dataUrl = `data:${mime};base64,${b64}`;
    } catch {
      return json({ ok: false, error: "Failed to read image" }, 400);
    }
  } else if (typeof slugRaw === "string" && slugRaw.trim()) {
    const slug = slugFromUrl(slugRaw);
    if (!slug) return json({ ok: false, error: "Invalid Polymarket slug" }, 400);
    input.slug = slug;
  } else if (typeof urlRaw === "string" && urlRaw.trim()) {
    const slug = slugFromUrl(urlRaw);
    if (!slug) return json({ ok: false, error: "Invalid Polymarket URL" }, 400);
    input.url = urlRaw;
  } else {
    return json({ ok: false, error: "Provide an image, a slug, or a url." }, 400);
  }

  const result = await runAnalyze(input);
  if (!result.ok) {
    const status = result.error.includes("Couldn't find") ? 422 : 502;
    return json(result, status);
  }
  return json(result);
}
