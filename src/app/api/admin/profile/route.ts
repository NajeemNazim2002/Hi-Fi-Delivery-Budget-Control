import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await q(
    "SELECT name, username FROM users WHERE id=$1 AND role='admin' AND active=TRUE",
    [admin.uid]
  );
  if (!rows[0]) return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
  return NextResponse.json({ name: rows[0].name, username: rows[0].username });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await req.json().catch(() => ({}));
  const body = parsed && typeof parsed === "object" ? parsed : {};
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "Enter your current password and a new password." }, { status: 400 });
  if (newPassword.length < 8)
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  if (newPassword.length > 128)
    return NextResponse.json({ error: "New password must be 128 characters or fewer." }, { status: 400 });
  if (currentPassword === newPassword)
    return NextResponse.json({ error: "Choose a new password different from your current password." }, { status: 400 });

  const rows = await q(
    "SELECT password_hash FROM users WHERE id=$1 AND role='admin' AND active=TRUE",
    [admin.uid]
  );
  if (!rows[0]) return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
  if (!(await bcrypt.compare(currentPassword, rows[0].password_hash)))
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await q(
    "UPDATE users SET password_hash=$1 WHERE id=$2 AND role='admin' AND active=TRUE",
    [passwordHash, admin.uid]
  );
  return NextResponse.json({ ok: true });
}
