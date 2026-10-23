import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ cameraId: string }> }) {
  const { cameraId } = await context.params;
  return NextResponse.json({ available: false, cameraId, message: "视频网关尚未接入真实摄像头" }, { status: 503 });
}
