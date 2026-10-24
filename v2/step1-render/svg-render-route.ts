import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

// step1: 直接渲染 SVG（不分析）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let svgText = String(body?.svgText || "");
    if (!svgText && /^data:image\/svg/i.test(String(body?.sourceSvgDataUrl || ""))) {
      const url = String(body.sourceSvgDataUrl);
      svgText = Buffer.from(url.slice(url.indexOf(",") + 1), "base64").toString("utf8");
    }
    if (!/<svg/i.test(svgText)) return NextResponse.json({ error: "SVG_INVALID" }, { status: 400 });
    const png = await sharp(Buffer.from(svgText), { density: 150 }).resize({ width: 1024, withoutEnlargement: true }).png().toBuffer();
    return new NextResponse(png, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "SVG_RENDER_FAILED" }, { status: 500 });
  }
}
