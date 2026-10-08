import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isValidDate, today } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "rider")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") || today();
  if (!isValidDate(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const notes = await q(
    `SELECT id, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date,
      delivery_location, delivery_amount::float8 AS delivery_amount, payment_type, note, created_at
     FROM rider_delivery_notes WHERE rider_id=$1 AND delivery_date=$2 ORDER BY created_at DESC, id DESC`,
    [session.uid, date]
  );
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "rider")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await req.json().catch(() => ({}));
  const body = parsed && typeof parsed === "object" ? parsed : {};
  const date = typeof body.delivery_date === "string" ? body.delivery_date : "";
  const location = typeof body.delivery_location === "string" ? body.delivery_location.trim() : "";
  const paymentType = body.payment_type;
  const amount = typeof body.delivery_amount === "number" || typeof body.delivery_amount === "string"
    ? Number(body.delivery_amount)
    : NaN;
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!isValidDate(date)) return NextResponse.json({ error: "Enter a valid delivery date." }, { status: 400 });
  if (!location || location.length > 300)
    return NextResponse.json({ error: "Delivery location is required and must be 300 characters or fewer." }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99)
    return NextResponse.json({ error: "Enter a valid delivery fee." }, { status: 400 });
  if (paymentType !== "cash" && paymentType !== "online")
    return NextResponse.json({ error: "Choose cash or online payment." }, { status: 400 });
  if (note.length > 1000)
    return NextResponse.json({ error: "Additional note must be 1,000 characters or fewer." }, { status: 400 });

  const rows = await q(
    `INSERT INTO rider_delivery_notes
      (delivery_date, rider_id, delivery_location, delivery_amount, payment_type, note)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date,
       delivery_location, delivery_amount::float8 AS delivery_amount, payment_type, note, created_at`,
    [date, session.uid, location, amount, paymentType, note || null]
  );
  return NextResponse.json({ note: rows[0] }, { status: 201 });
}
