import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/validate";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const amount = money(b.amount);
  if (isNaN(amount) || amount <= 0) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  await q("UPDATE petty_cash SET amount=$1, note=$2 WHERE id=$3", [amount, String(b.note || "").trim() || null, Number(params.id)]);
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await q("DELETE FROM petty_cash WHERE id=$1", [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
