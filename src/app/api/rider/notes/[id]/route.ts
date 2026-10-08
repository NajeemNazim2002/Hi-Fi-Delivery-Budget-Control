import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isValidDate } from "@/lib/date";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

function validNote(body: any) {
  const date = typeof body.delivery_date === "string" ? body.delivery_date : "";
  const location = typeof body.delivery_location === "string" ? body.delivery_location.trim() : "";
  const paymentType = body.payment_type;
  const amount = typeof body.delivery_amount === "number" || typeof body.delivery_amount === "string"
    ? Number(body.delivery_amount)
    : NaN;
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!isValidDate(date)) return { error: "Enter a valid delivery date." };
  if (!location || location.length > 300)
    return { error: "Delivery location is required and must be 300 characters or fewer." };
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99)
    return { error: "Enter a valid delivery fee." };
  if (paymentType !== "cash" && paymentType !== "online")
    return { error: "Choose cash or online payment." };
  if (note.length > 1000)
    return { error: "Additional note must be 1,000 characters or fewer." };

  return { data: { date, location, amount, paymentType, note } };
}

export async function PUT(req: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "rider")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return NextResponse.json({ error: "Invalid delivery note." }, { status: 400 });

  const parsed = await req.json().catch(() => ({}));
  const body = parsed && typeof parsed === "object" ? parsed : {};
  const validated = validNote(body);
  if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 });

  const { date, location, amount, paymentType, note } = validated.data!;
  const rows = await q(
    `UPDATE rider_delivery_notes
     SET delivery_date=$1, delivery_location=$2, delivery_amount=$3, payment_type=$4, note=$5
     WHERE id=$6 AND rider_id=$7
     RETURNING id, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date,
       delivery_location, delivery_amount::float8 AS delivery_amount, payment_type, note, created_at`,
    [date, location, amount, paymentType, note || null, id, session.uid]
  );
  if (!rows[0]) return NextResponse.json({ error: "Delivery note not found." }, { status: 404 });
  return NextResponse.json({ note: rows[0] });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "rider")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return NextResponse.json({ error: "Invalid delivery note." }, { status: 400 });

  const rows = await q(
    "DELETE FROM rider_delivery_notes WHERE id=$1 AND rider_id=$2 RETURNING id",
    [id, session.uid]
  );
  if (!rows[0]) return NextResponse.json({ error: "Delivery note not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
