import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await q("SELECT id,name,username,phone,active FROM users WHERE role='rider' ORDER BY name");
  return NextResponse.json({ riders: rows });
}
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim(), username = String(b.username || "").trim().toLowerCase();
  const password = String(b.password || ""), phone = String(b.phone || "").trim();
  if (!name || !username || password.length < 6)
    return NextResponse.json({ error: "Name, username and a password (min 6 chars) are required" }, { status: 400 });
  try {
    await q("INSERT INTO users (name,username,password_hash,role,phone) VALUES ($1,$2,$3,'rider',$4)",
      [name, username, await bcrypt.hash(password, 10), phone || null]);
  } catch (e: any) {
    if (String(e.message).includes("unique")) return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (typeof b.active === "boolean") await q("UPDATE users SET active=$1 WHERE id=$2 AND role='rider'", [b.active, b.id]);
  if (b.password) {
    if (String(b.password).length < 6) return NextResponse.json({ error: "Password min 6 chars" }, { status: 400 });
    await q("UPDATE users SET password_hash=$1 WHERE id=$2 AND role='rider'", [await bcrypt.hash(String(b.password), 10), b.id]);
  }
  return NextResponse.json({ ok: true });
}
