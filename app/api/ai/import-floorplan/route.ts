import { NextRequest, NextResponse } from "next/server";
import { getFloorplanSpec } from "@/lib/floorplans";
export const runtime = "nodejs";

type CacheEntry = { floorplanSpec: ReturnType<typeof getFloorplanSpec>; provider: "pascal-v2" };
const cacheKey = "__dreamhouse_floorplan_import_cache__";
function importCache() {
  const globalCache = globalThis as typeof globalThis & { [cacheKey]?: Map<string, CacheEntry> };
  return (globalCache[cacheKey] ||= new Map<string, CacheEntry>());
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const type = b?.residenceType;
    if (!(["one", "two", "three"] as const).includes(type) || !b?.variantId || !b?.imageHash)
      return NextResponse.json(
        { error: "residenceType, variantId and imageHash are required" },
        { status: 400 },
      );
    const key = `${type}:${b.variantId}:${b.imageHash}`;
    let entry = b.forceReimport ? undefined : importCache().get(key);
    if (!entry) {
      // The source-driven Pascal V2 catalog is authoritative for geometry.
      // Image/Qwen import remains an upstream suggestion channel, never a
      // second geometry source that can silently replace the selected plan.
      entry = { floorplanSpec: getFloorplanSpec(type, Number(b.optionIndex || 1), b.imageUrl), provider: "pascal-v2" };
      importCache().set(key, entry);
    }
    return NextResponse.json({
      sessionId:
        b.sessionId ||
        `session-${b.variantId}-${String(b.imageHash).slice(0, 12)}`,
      requestId: b.requestId,
      source: {
        residenceType: type,
        variantId: b.variantId,
        imageHash: b.imageHash,
        imageUrl: b.imageUrl || null,
      },
      floorplanSpec: entry.floorplanSpec,
      provider: entry.provider,
      cacheKey: key,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "floorplan import failed" },
      { status: 400 },
    );
  }
}
