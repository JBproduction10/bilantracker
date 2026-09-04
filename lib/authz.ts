import type { SessionUser } from "./types";

/** Full visibility across every school: manage everything (us). */
export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === "super_admin";
}

/** Full visibility across every school, read-only (the promoter). */
export function isPromoter(user: SessionUser): boolean {
  return user.role === "promoter";
}

/** Bonté Service: network-wide, validates/executes purchase order requests but never touches student/employee data directly. */
export function isTreasury(user: SessionUser): boolean {
  return user.role === "treasury";
}

/** Can see every school's data, whether or not they can edit it. */
export function canViewAllSchools(user: SessionUser): boolean {
  return user.role === "super_admin" || user.role === "promoter" || user.role === "treasury";
}

/** Can read this specific school's data (students, expenses, payslips, reports). */
export function canReadSchool(user: SessionUser, schoolId: string): boolean {
  if (canViewAllSchools(user)) return true;
  return user.schoolId === schoolId;
}

/**
 * Can add/edit/remove employees, departments, fields, and generate/notify
 * payslips for this school. Deliberately does NOT cover students, fee
 * payments/adjustments, or expenses — see canManageStudents and
 * canManageExpenses. Finance and teacher accounts are read-only.
 */
export function canManageSchool(user: SessionUser, schoolId: string): boolean {
  if (user.role === "super_admin") return true;
  if (user.role === "school_admin") return user.schoolId === schoolId;
  return false;
}

/**
 * Enroll, edit, or remove students; record or void fee payments; set or
 * remove fee adjustments (social case, discount). This is the separation
 * of duties the "Caisse" account exists for: the cashier is the only
 * school-level role that actually touches student/fee records, so theft
 * or errors trace to one person. A school admin can still see this data
 * (via canReadSchool) but cannot write it.
 */
export function canManageStudents(user: SessionUser, schoolId: string): boolean {
  if (user.role === "super_admin") return true;
  if (user.role === "cashier") return user.schoolId === schoolId;
  return false;
}

/** Log, edit, or remove day-to-day school expenses — same cashier-only split as canManageStudents. */
export function canManageExpenses(user: SessionUser, schoolId: string): boolean {
  return canManageStudents(user, schoolId);
}

/**
 * Emailing a fee receipt doesn't change any financial record, so it's
 * intentionally broader than canManageStudents: either the cashier who
 * collected the payment, or the school admin following up with a parent,
 * can send one.
 */
export function canSendReceipts(user: SessionUser, schoolId: string): boolean {
  return canManageStudents(user, schoolId) || canManageSchool(user, schoolId);
}

/** Can view payslips for this school (finance: all payslips; teacher: only their own, enforced separately). */
export function canViewPayslips(user: SessionUser, schoolId: string): boolean {
  if (canManageSchool(user, schoolId)) return true;
  if (user.role === "finance" && user.schoolId === schoolId) return true;
  return false;
}

/**
 * Sending payslips — a single one, all drafts for a period, or marking a
 * status by hand — is deliberately narrower than canManageSchool. School
 * admins still generate drafts, but only the super admin actually sends;
 * the school admin's role in that step is to notify readiness instead
 * (see canNotifyPayslipsReady).
 */
export function canSendPayslips(user: SessionUser): boolean {
  return user.role === "super_admin";
}

/** A school admin (or the super admin) can tell the super admin their school's employees are ready for a pay period. */
export function canNotifyPayslipsReady(user: SessionUser, schoolId: string): boolean {
  return canManageSchool(user, schoolId);
}

/** A school admin (or super admin) can submit a "bon de commande" for their own school. */
export function canSubmitPurchaseOrder(user: SessionUser, schoolId: string): boolean {
  return canManageSchool(user, schoolId);
}

/** Only Bonté Service (treasury) or the super admin validate/reject/execute a request — never the school itself. */
export function canDecidePurchaseOrder(user: SessionUser): boolean {
  return user.role === "super_admin" || user.role === "treasury";
}

/** Anyone who can already see the school, plus treasury/promoter (covered by canReadSchool via canViewAllSchools). */
export function canViewPurchaseOrders(user: SessionUser, schoolId?: string): boolean {
  if (canViewAllSchools(user)) return true;
  if (!schoolId) return false;
  return canReadSchool(user, schoolId);
}

/**
 * Manages the "Intendance" stock for a school: the dedicated logistics
 * account for that school, its admin, or the super admin. Deliberately
 * distinct from canManageSchool — a school admin who also holds the
 * logistics account is fine, but the two are separate profiles by design
 * (the whole point is separation of duties around inventory theft).
 */
export function canManageInventory(user: SessionUser, schoolId: string): boolean {
  if (user.role === "super_admin") return true;
  if (user.role === "school_admin") return user.schoolId === schoolId;
  if (user.role === "logistics") return user.schoolId === schoolId;
  return false;
}

export function canViewInventory(user: SessionUser, schoolId: string): boolean {
  if (canManageInventory(user, schoolId)) return true;
  return canReadSchool(user, schoolId);
}

/** Bonté Service pushes the base salaries; the super admin is the only one who applies them (generates + sends). */
export function canSubmitSalaryGrid(user: SessionUser): boolean {
  return user.role === "treasury" || user.role === "super_admin";
}

export function canDecideSalaryGrid(user: SessionUser): boolean {
  return user.role === "super_admin";
}

export function canViewSalaryGrid(user: SessionUser, schoolId?: string): boolean {
  if (canViewAllSchools(user)) return true;
  if (!schoolId) return false;
  return canReadSchool(user, schoolId);
}

export function requireCondition(condition: boolean, message = "You don't have access to do that."): void {
  if (!condition) {
    const err = new Error(message) as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}
