import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isValidDate, today } from "@/lib/date";
import { money } from "@/lib/validate";
import { pettyBetween } from "@/lib/report";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = new URL(req.url).searchParams.get("date") || today();
  if (!isValidDate(d)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  return NextResponse.json({ petty: await pettyBetween(d, d) });
}
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const rider_id = Number(b.rider_id), amount = money(b.amount);
  const date = b.delivery_date || today();
  if (!rider_id) return NextResponse.json({ error: "Select a delivery partner" }, { status: 400 });
  if (isNaN(amount) || amount <= 0) return NextResponse.json({ error: "Enter a petty cash amount" }, { status: 400 });
  if (!isValidDate(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  await q("INSERT INTO petty_cash (delivery_date,rider_id,amount,note) VALUES ($1,$2,$3,$4)",
    [date, rider_id, amount, String(b.note || "").trim() || null]);
  return NextResponse.json({ ok: true, date, rider_id });
}
