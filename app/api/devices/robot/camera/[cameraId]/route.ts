import { NextResponse } from "next/server";
import { getRobotMonitorAdapter } from "@/lib/execution/RobotMonitorAdapter";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ cameraId: string }> }) {
  const { cameraId } = await context.params;
  const image = await getRobotMonitorAdapter().getCamera(cameraId);
  if (!image) return new NextResponse("当前画面暂时不可用", { status: 404 });
  const match = image.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return new NextResponse("当前画面暂时不可用", { status: 404 });
  return new NextResponse(Buffer.from(match[2], "base64"), { headers: { "content-type": match[1], "cache-control": "no-store" } });
}
