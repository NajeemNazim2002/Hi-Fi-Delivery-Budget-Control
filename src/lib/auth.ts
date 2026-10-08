import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE = "hifi_session";
export type Session = { uid: number; role: "admin" | "rider"; name: string };

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export async function signSession(s: Session) {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("12h").sign(secret());
}
export async function verifyToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { uid: Number(payload.uid), role: payload.role as any, name: String(payload.name) };
  } catch { return null; }
}
export async function getSession(): Promise<Session | null> {
  return verifyToken(cookies().get(COOKIE)?.value);
}
export async function requireAdmin() {
  const s = await getSession();
  return s && s.role === "admin" ? s : null;
}
