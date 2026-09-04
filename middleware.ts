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
  treasury: "/dashboard",
  logistics: "/inventory",
  cashier: "/students",
};

/** Path prefixes each role is allowed into. "*" means everything under the matcher. */
const ROLE_ALLOWED: Record<Role, string[]> = {
  super_admin: ["*"], // includes /settings
  promoter: ["/dashboard", "/reports", "/audit-log", "/purchase-orders", "/salary-grid"],
  school_admin: ["/dashboard", "/students", "/receipt-requests", "/expenses", "/employees", "/departments", "/payslips", "/send", "/fields", "/purchase-orders", "/inventory", "/salary-grid"],
  finance: ["/dashboard", "/payslips"],
  teacher: ["/my-payslips"],
  treasury: ["/dashboard", "/purchase-orders", "/reports", "/salary-grid"],
  logistics: ["/inventory"],
  // Caisse: the only school-level role that actually enrolls students and
  // collects fees. Scoped narrowly, same as logistics — no dashboard, no
  // employee/payroll/requisition access.
  cashier: ["/students", "/receipt-requests", "/expenses"],
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
    "/purchase-orders/:path*",
    "/inventory/:path*",
    "/salary-grid/:path*",
    "/settings/:path*",
  ],
};
