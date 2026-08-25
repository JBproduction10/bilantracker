export type EmployeeStatus = "Active" | "On Leave" | "Inactive";
export type PayslipStatus = "draft" | "sent";
export type FieldType = "fixed" | "percent";
export type FieldCategory = "earnings" | "deductions" | "info";
export type Role = "super_admin" | "promoter" | "school_admin" | "finance" | "teacher";
export type UserStatus = "pending" | "active";
export type FeeStatus = "paid" | "partial" | "unpaid" | "social_case";
export type ExpenseCategory = "fuel" | "credit" | "renovation" | "supplies" | "utilities" | "maintenance" | "other";
export type PaymentMethod = "cash" | "mobile_money" | "bank_transfer" | "other";
export type AdjustmentReason = "social_case" | "discount" | "other";

export interface Department {
  id: string;
  name: string;
  head: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  baseSalary: number;
  status: EmployeeStatus;
  email: string;
  joinDate: string;
}

export interface FieldItem {
  id: string;
  label: string;
  required: boolean;
  type?: FieldType;
  value?: number;
}

export interface Fields {
  earnings: FieldItem[];
  deductions: FieldItem[];
  info: FieldItem[];
}

export interface PayslipRow {
  label: string;
  amount: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  period: string;
  status: PayslipStatus;
  generatedAt: number;
  earningsRows: PayslipRow[];
  gross: number;
  deductionsRows: PayslipRow[];
  totalDeductions: number;
  net: number;
}

export interface Payment {
  id: string;
  studentId: string;
  period: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  note?: string;
  recordedBy?: string;
  recordedAt: number;
}

export interface FeeAdjustment {
  id: string;
  studentId: string;
  period: string;
  amountDue: number;
  reason: AdjustmentReason;
  note?: string;
  recordedBy?: string;
  createdAt: number;
}

/** A student's computed position for one period — always derived from the ledger, never stored. */
export interface StudentPeriodLedger {
  studentId: string;
  period: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: FeeStatus;
  isAdjusted: boolean;
  adjustmentReason?: AdjustmentReason;
  payments: Payment[];
}

export interface Student {
  id: string;
  name: string;
  className: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  monthlyFee: number;
}

export interface StudentWithLedger extends Student {
  ledger: StudentPeriodLedger;
}

export type ReceiptRequestStatus = "pending" | "sent" | "declined";

/**
 * A parent has no account in this system — this is how they ask for a copy
 * of an installment payment anyway: a public form creates one of these,
 * and a school admin fulfills it against the real ledger.
 */
export interface ReceiptRequest {
  id: string;
  studentName: string;
  className?: string;
  period: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone?: string;
  note?: string;
  status: ReceiptRequestStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  linkedStudentId?: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  period: string;
  date: string;
  note?: string;
  addedBy?: string;
  createdAt: number;
}

export interface School {
  id: string;
  name: string;
  domain: string;
  description: string;
  color: string;
  departments: Department[];
  employees: Employee[];
  fields: Fields;
  payslips: Payslip[];
  students: Student[];
  payments: Payment[];
  feeAdjustments: FeeAdjustment[];
  expenses: Expense[];
  receiptRequests: ReceiptRequest[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: Role;
  schoolId?: string;
  employeeId?: string;
  status: UserStatus;
  inviteToken?: string;
  inviteTokenExpires?: number;
  resetToken?: string;
  resetTokenExpires?: number;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  schoolId?: string;
  employeeId?: string;
}

export interface SchoolReport {
  schoolId: string;
  schoolName: string;
  color: string;
  period: string;
  studentsTotal: number;
  studentsPaid: number;
  studentsPartial: number;
  studentsUnpaid: number;
  studentsSocialCase: number;
  totalDue: number;
  totalIncome: number;
  totalSalariesSent: number;
  totalSalariesDraft: number;
  totalExpenses: number;
  totalOutflow: number;
  netBalance: number;
}

export type AuditAction =
  | "payment.add" | "payment.remove"
  | "fee_adjustment.set" | "fee_adjustment.remove"
  | "expense.add" | "expense.remove" | "expense.update"
  | "student.add" | "student.remove" | "student.update"
  | "employee.add" | "employee.remove" | "employee.update"
  | "department.add" | "department.remove" | "department.update"
  | "field.add" | "field.update" | "field.remove"
  | "payslip.generate" | "payslip.status" | "payslip.send" | "payslip.mark_all_sent" | "payslip.send_all"
  | "school.create" | "school.update" | "school.delete"
  | "user.create" | "user.remove" | "user.resend_invite"
  | "receipt.send" | "receipt_request.send" | "receipt_request.decline";

/**
 * One entry in the audit trail: who did what, when, to which school, and
 * enough detail to mean something on its own without cross-referencing
 * anything else. This is the record that lets a promoter (or a super admin
 * looking into a discrepancy) see exactly what changed and who changed it —
 * the whole point of a system built around verifying declarations rather
 * than trusting them blindly.
 */
export interface AuditEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  schoolId?: string;
  schoolName?: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, string | number | boolean | undefined>;
}

/** Payload shapes accepted by the write endpoints / data-layer functions. */
export interface SchoolInput {
  name: string;
  domain: string;
  description?: string;
  color?: string;
}

export interface DepartmentInput {
  name: string;
  head?: string;
  description?: string;
}

export interface EmployeeInput {
  name: string;
  position: string;
  department: string;
  baseSalary: number | string;
  status?: EmployeeStatus;
}

export interface FieldInput {
  label: string;
  type?: FieldType;
  value?: number | string;
  required?: boolean;
}

export interface StudentInput {
  name: string;
  className: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  monthlyFee: number | string;
}

export interface PaymentInput {
  period: string;
  amount: number | string;
  date?: string;
  method?: PaymentMethod;
  note?: string;
}

export interface FeeAdjustmentInput {
  period: string;
  amountDue: number | string;
  reason: AdjustmentReason;
  note?: string;
}

export interface ExpenseInput {
  category: ExpenseCategory;
  label: string;
  amount: number | string;
  period: string;
  date?: string;
  note?: string;
}

export interface UserInput {
  name: string;
  email: string;
  role: Role;
  schoolId?: string;
  employeeId?: string;
}

export interface SetPasswordInput {
  token: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ReceiptRequestInput {
  studentName: string;
  className?: string;
  period: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone?: string;
  note?: string;
}

export interface SendReceiptInput {
  period: string;
  guardianEmail: string;
  guardianName?: string;
}

export interface PublicSchool {
  id: string;
  name: string;
  color: string;
}

export interface SendAllDraftsFailure {
  payslipId: string;
  employeeName: string;
  reason: string;
}

export interface SendAllDraftsResponse {
  ok: boolean;
  sent: number;
  attempted: number;
  simulated: boolean;
  failures: SendAllDraftsFailure[];
}
