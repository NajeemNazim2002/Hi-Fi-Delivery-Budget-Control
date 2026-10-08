import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verifyToken(req.cookies.get(COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");
  const deny = () =>
    isApi ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
          : NextResponse.redirect(new URL("/login", req.url));

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!s || s.role !== "admin") return deny();
  }
  if (pathname.startsWith("/rider") || pathname.startsWith("/api/rider")) {
    if (!s || s.role !== "rider") return deny();
  }
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/rider/:path*", "/api/admin/:path*", "/api/rider/:path*"] };
