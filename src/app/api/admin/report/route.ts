import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isValidDate, today } from "@/lib/date";
import { dayReport } from "@/lib/report";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = new URL(req.url).searchParams.get("date") || today();
  if (!isValidDate(d)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  return NextResponse.json({ date: d, riders: await dayReport(d) });
}
