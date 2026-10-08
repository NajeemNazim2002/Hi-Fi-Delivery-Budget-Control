import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDelivery } from "@/lib/validate";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error, data } = parseDelivery(await req.json().catch(() => ({})));
  if (error) return NextResponse.json({ error }, { status: 400 });
  await q(
    `UPDATE deliveries SET delivery_date=$1,rider_id=$2,payment_type=$3,customer_name=$4,customer_phone=$5,
     pickup_location=$6,delivery_location=$7,delivery_amount=$8,extra_amount=$9,products_amount=$10,updated_at=now() WHERE id=$11`,
    [data.delivery_date, data.rider_id, data.payment_type, data.customer_name, data.customer_phone,
     data.pickup_location, data.delivery_location, data.delivery_amount, data.extra_amount, data.products_amount, Number(params.id)]);
  return NextResponse.json({ ok: true, date: data.delivery_date, rider_id: data.rider_id });
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await q("DELETE FROM deliveries WHERE id=$1", [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
