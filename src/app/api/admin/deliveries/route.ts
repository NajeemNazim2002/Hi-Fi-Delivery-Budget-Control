import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDelivery } from "@/lib/validate";
import { isValidDate, today } from "@/lib/date";
import { deliveriesBetween } from "@/lib/report";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = new URL(req.url).searchParams.get("date") || today();
  if (!isValidDate(d)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  return NextResponse.json({ deliveries: await deliveriesBetween(d, d) });
}
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error, data } = parseDelivery(await req.json().catch(() => ({})));
  if (error) return NextResponse.json({ error }, { status: 400 });
  const rider = await q("SELECT id FROM users WHERE id=$1 AND role='rider' AND active", [data.rider_id]);
  if (!rider[0]) return NextResponse.json({ error: "Delivery partner not found" }, { status: 400 });
  const rows = await q(
    `INSERT INTO deliveries (delivery_date,rider_id,payment_type,customer_name,customer_phone,pickup_location,delivery_location,delivery_amount,extra_amount,products_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [data.delivery_date, data.rider_id, data.payment_type, data.customer_name, data.customer_phone,
     data.pickup_location, data.delivery_location, data.delivery_amount, data.extra_amount, data.products_amount]);
  return NextResponse.json({ ok: true, id: rows[0].id, date: data.delivery_date, rider_id: data.rider_id });
}
