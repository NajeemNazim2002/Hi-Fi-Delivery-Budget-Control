import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isValidDate, today } from "@/lib/date";
import { deliveriesBetween } from "@/lib/report";
import { summarizeDeliveryPayments } from "@/lib/payment-summary";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const from = params.get("from") || today();
  const to = params.get("to") || from;
  const riderParam = params.get("riderId");
  const riderId = riderParam === null || riderParam === "" ? undefined : Number(riderParam);
  if (!isValidDate(from) || !isValidDate(to) || from > to)
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  if (riderId !== undefined && (!Number.isInteger(riderId) || riderId < 1))
    return NextResponse.json({ error: "Invalid delivery partner" }, { status: 400 });

  const deliveries = await deliveriesBetween(from, to, riderId);
  const summary = summarizeDeliveryPayments(deliveries);

  return NextResponse.json({
    from,
    to,
    ...summary,
  });
}
