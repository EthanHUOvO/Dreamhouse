import { NextResponse } from "next/server";
import { getBambuPrinterService } from "@/lib/execution/BambuPrinterService";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getBambuPrinterService().getStatus());
}
