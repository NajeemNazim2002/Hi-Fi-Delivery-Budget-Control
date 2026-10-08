import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isValidDate, today } from "@/lib/date";
import { dayReport } from "@/lib/report";
import { computeBudget } from "@/lib/budget";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "rider") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = new URL(req.url).searchParams.get("date") || today();
  if (!isValidDate(d)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const rep = (await dayReport(d, s.uid))[0];
  return NextResponse.json({
    date: d, name: s.name,
    deliveries: rep?.deliveries ?? [], petty: rep?.petty ?? [], budget: rep?.budget ?? computeBudget([], []),
  });
}
