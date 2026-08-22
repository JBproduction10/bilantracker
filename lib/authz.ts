import type { SessionUser } from "./types";

/** Full visibility across every school: manage everything (us). */
export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === "super_admin";
}

/** Full visibility across every school, read-only (the promoter). */
export function isPromoter(user: SessionUser): boolean {
  return user.role === "promoter";
}

/** Can see every school's data, whether or not they can edit it. */
export function canViewAllSchools(user: SessionUser): boolean {
  return user.role === "super_admin" || user.role === "promoter";
}

/** Can read this specific school's data (students, expenses, payslips, reports). */
export function canReadSchool(user: SessionUser, schoolId: string): boolean {
  if (canViewAllSchools(user)) return true;
  return user.schoolId === schoolId;
}

/**
 * Can add/edit/remove records for this school: students, expenses,
 * employees, departments, fields, payslip generation & sending.
 * Finance and teacher accounts are read-only.
 */
export function canManageSchool(user: SessionUser, schoolId: string): boolean {
  if (user.role === "super_admin") return true;
  if (user.role === "school_admin") return user.schoolId === schoolId;
  return false;
}

/** Can view payslips for this school (finance: all payslips; teacher: only their own, enforced separately). */
export function canViewPayslips(user: SessionUser, schoolId: string): boolean {
  if (canManageSchool(user, schoolId)) return true;
  if (user.role === "finance" && user.schoolId === schoolId) return true;
  return false;
}

export function requireCondition(condition: boolean, message = "You don't have access to do that."): void {
  if (!condition) {
    const err = new Error(message) as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}
