import { NextResponse } from "next/server";
import { getRobotMonitorAdapter } from "@/lib/execution/RobotMonitorAdapter";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getRobotMonitorAdapter().getStatus());
}
