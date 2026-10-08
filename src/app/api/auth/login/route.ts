import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { q } from "@/lib/db";
import { signSession, COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return NextResponse.json({ error: "Enter username and password" }, { status: 400 });
  const rows = await q("SELECT id,name,role,password_hash,active FROM users WHERE username=$1", [String(username).trim().toLowerCase()]);
  const u = rows[0];
  if (!u || !u.active || !(await bcrypt.compare(String(password), u.password_hash)))
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  const token = await signSession({ uid: u.id, role: u.role, name: u.name });
  const res = NextResponse.json({ role: u.role });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
