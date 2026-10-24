import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { pascalV2Catalog } from "@/lib/floorplans/pascal-v2/index";

const catalogPath = path.join(process.cwd(), "lib", "floorplans", "pascal-v2", "overrides.json");
const backupPath = path.join(process.cwd(), "lib", "floorplans", "pascal-v2", "overrides.before-editor.json");

export async function GET() {
  return NextResponse.json({ entries: pascalV2Catalog.map((spec) => ({ variantId: spec.id, imageUrl: spec.sourceImage, floorplanSpec: spec })) });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const variantId = String(body?.variantId || "");
  const nextSpec = body?.floorplanSpec;
  if (!variantId || !nextSpec || nextSpec.id !== variantId) return NextResponse.json({ error: "variantId and matching floorplanSpec are required" }, { status: 400 });
  const entry = pascalV2Catalog.find((candidate) => candidate.id === variantId);
  if (!entry) return NextResponse.json({ error: "unknown variantId" }, { status: 404 });
  const overrides = await fs.readFile(catalogPath, "utf8").then((value) => JSON.parse(value)).catch(() => ({}));
  if (!(await fileExists(backupPath))) await fs.writeFile(backupPath, JSON.stringify(overrides, null, 2) + "\n", "utf8");
  Object.assign(entry, nextSpec);
  overrides[variantId] = nextSpec;
  await fs.writeFile(catalogPath, JSON.stringify(overrides, null, 2) + "\n", "utf8");
  console.info("[FLOORPLAN CALIBRATION SAVE]", { variantId, wallCount: nextSpec.walls?.length || 0, doorCount: nextSpec.doors?.length || 0, windowCount: nextSpec.windows?.length || 0 });
  return NextResponse.json({ ok: true, variantId, source: "pascal-v2" });
}

async function fileExists(filePath: string) {
  try { await fs.access(filePath); return true; } catch { return false; }
}
