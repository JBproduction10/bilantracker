import type { Role } from "./types";

/**
 * Where each role lands right after signing in (and where a role gets
 * bounced back to if it strays somewhere it can't access). The super admin
 * lands on the promoters list first — everything else it does (schools,
 * accounts, the network dashboard, per-school tools) happens inside a
 * chosen promoter's workspace, not floating across every tenant at once.
 */
export const ROLE_HOME: Record<Role, string> = {
  super_admin: "/promoters",
  promoter: "/dashboard",
  school_admin: "/dashboard",
  finance: "/dashboard",
  teacher: "/my-payslips",
  treasury: "/dashboard",
  logistics: "/inventory",
  cashier: "/students",
};
