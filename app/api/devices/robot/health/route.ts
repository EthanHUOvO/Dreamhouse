import { NextResponse } from "next/server";
import { getRobotMonitorAdapter } from "@/lib/execution/RobotMonitorAdapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const adapter = getRobotMonitorAdapter();
  await adapter.getStatus();
  return NextResponse.json(adapter.getHealth());
}
