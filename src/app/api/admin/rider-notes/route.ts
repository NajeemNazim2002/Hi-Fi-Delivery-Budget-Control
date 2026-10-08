import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isValidDate, today } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") || today();
  if (!isValidDate(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const notes = await q(
    `SELECT n.id, to_char(n.delivery_date, 'YYYY-MM-DD') AS delivery_date,
      n.rider_id, u.name AS rider_name, n.delivery_location,
      n.delivery_amount::float8 AS delivery_amount, n.payment_type, n.note, n.created_at
     FROM rider_delivery_notes n JOIN users u ON u.id=n.rider_id
     WHERE n.delivery_date=$1 ORDER BY u.name, n.created_at DESC, n.id DESC`,
    [date]
  );
  return NextResponse.json({ notes });
}
