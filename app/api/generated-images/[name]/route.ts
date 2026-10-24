import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!/^[a-f0-9-]+\.(?:png|jpg|jpeg|webp)$/i.test(name)) return NextResponse.json({ error: "invalid image name" }, { status: 400 });
  try {
    const directory = process.env.GENERATED_IMAGE_DIR || join(process.cwd(), "data", "generated");
    const data = await readFile(join(directory, name));
    const contentType = name.endsWith(".webp") ? "image/webp" : /\.jpe?g$/i.test(name) ? "image/jpeg" : "image/png";
    return new NextResponse(data, { headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return NextResponse.json({ error: "generated image not found" }, { status: 404 });
  }
}
