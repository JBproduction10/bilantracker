import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@/lib/types";

const ROLE_HOME: Record<Role, string> = {
  super_admin: "/dashboard",
  promoter: "/dashboard",
  school_admin: "/dashboard",
  finance: "/dashboard",
  teacher: "/my-payslips",
};

/** Path prefixes each role is allowed into. "*" means everything under the matcher. */
const ROLE_ALLOWED: Record<Role, string[]> = {
  super_admin: ["*"],
  promoter: ["/dashboard", "/reports", "/audit-log"],
  school_admin: ["/dashboard", "/students", "/receipt-requests", "/expenses", "/employees", "/departments", "/payslips", "/send", "/fields", "/audit-log"],
  finance: ["/dashboard", "/payslips"],
  teacher: ["/my-payslips"],
};

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as Role | undefined;
  const path = req.nextUrl.pathname;
  const allowed = (role && ROLE_ALLOWED[role]) || [];
  const isAllowed = allowed.includes("*") || allowed.some((p) => path === p || path.startsWith(p + "/"));

  if (!isAllowed) {
    const home = (role && ROLE_HOME[role]) || "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/schools/:path*",
    "/users/:path*",
    "/students/:path*",
    "/receipt-requests/:path*",
    "/expenses/:path*",
    "/employees/:path*",
    "/departments/:path*",
    "/fields/:path*",
    "/payslips/:path*",
    "/send/:path*",
    "/reports/:path*",
    "/audit-log/:path*",
    "/my-payslips/:path*",
  ],
};
