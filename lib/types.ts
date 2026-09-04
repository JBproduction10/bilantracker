export type EmployeeStatus = "Active" | "On Leave" | "Inactive";
export type StudentStatus = "active" | "withdrawn";
export type Cycle = "primaire" | "orientation" | "superieur";
export type PayslipStatus = "draft" | "sent";
export type FieldType = "fixed" | "percent";
export type FieldCategory = "earnings" | "deductions" | "info";
export type Role = "super_admin" | "promoter" | "school_admin" | "finance" | "teacher" | "treasury" | "logistics" | "cashier";
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
  /** Soft-delete marker — set instead of removing the record outright, so payslip history stays intact. Absent/null = active. */
  deletedAt?: string | null;
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
  /**
   * The three cycles a student is enrolled through, per the same
   * Primaire → Cycle d'orientation → Cycle supérieur structure used
   * across the network. `className` remains the specific class within
   * that cycle (e.g. "6ème Primaire"), so filtering/reporting can group
   * by cycle without parsing text. See lib/academic.ts.
   */
  cycle: Cycle;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  monthlyFee: number;
  /** "withdrawn" keeps the record (and its fee history) without deleting it outright. */
  status: StudentStatus;
  joinDate: string;
  note?: string;
  /** Soft-delete marker — set instead of removing the record outright. Absent/null = active. */
  deletedAt?: string | null;
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

export type SalaryGridStatus = "pending" | "applied" | "rejected";

export interface SalaryGridEntry {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  note?: string;
}

export interface SalaryGridEntryInput {
  employeeId: string;
  baseSalary: number | string;
  note?: string;
}

/**
 * Bonté Service's monthly push of base salaries for a school. The super
 * admin applies it — updating each employee's base salary, generating that
 * period's payslips, and sending them out in one step — so a school admin
 * never re-keys figures Bonté Service already sent.
 */
export interface SalaryGridSubmission {
  id: string;
  schoolId: string;
  schoolName: string;
  period: string;
  entries: SalaryGridEntry[];
  note?: string;
  status: SalaryGridStatus;
  submittedBy?: string;
  submittedAt: number;
  decidedBy?: string;
  decidedAt?: number;
  decisionNote?: string;
  generatedCount?: number;
  sentCount?: number;
}

export interface SalaryGridSubmissionInput {
  period: string;
  entries: SalaryGridEntryInput[];
  note?: string;
}

export interface SalaryGridDecisionInput {
  action: "apply" | "reject";
  note?: string;
}

export type PurchaseOrderStatus = "pending" | "validated" | "rejected" | "executed";

/**
 * A "bon de commande": a school's request to Bonté Service (Treasury) for
 * funds. Money never moves through the site — this just tracks the
 * request → validation → execution chain so the promoter can see exactly
 * what went out and why, closing the loophole where outgoing funds were
 * previously untracked.
 */
export interface PurchaseOrder {
  id: string;
  schoolId: string;
  schoolName: string;
  category: ExpenseCategory;
  label: string;
  amountRequested: number;
  period: string;
  note?: string;
  status: PurchaseOrderStatus;
  requestedBy?: string;
  requestedAt: number;
  decidedBy?: string;
  decidedAt?: number;
  decisionNote?: string;
  executedAmount?: number;
  executedAt?: number;
  /** Once executed, the matching Expense created on the school so it flows into the normal bilan. */
  executedExpenseId?: string;
}

export interface PurchaseOrderInput {
  category: ExpenseCategory;
  label: string;
  amountRequested: number | string;
  period: string;
  note?: string;
}

export interface PurchaseOrderDecisionInput {
  action: "validate" | "reject" | "execute";
  note?: string;
  executedAmount?: number | string;
}

export type InventoryCategory = "uniform" | "shoes" | "sweater" | "supplies" | "other";
export type StockMovementType = "in" | "sale" | "adjustment";

/** One tracked item in a school's "Intendance" stock (uniforms, shoes, sweaters...). */
export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unitPrice: number;
  quantityOnHand: number;
}

/**
 * One immutable movement against an item's stock — the ledger that lets
 * anyone reconcile "what came in" against "what was sold" instead of
 * trusting a single editable stock number, the same principle as the
 * payment ledger for students.
 */
export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  unitPrice?: number;
  amount?: number;
  period: string;
  date: string;
  note?: string;
  recordedBy?: string;
  recordedAt: number;
}

export interface InventoryItemInput {
  name: string;
  category: InventoryCategory;
  unitPrice: number | string;
  initialQuantity?: number | string;
}

export interface StockMovementInput {
  itemId: string;
  type: StockMovementType;
  quantity: number | string;
  unitPrice?: number | string;
  period: string;
  date?: string;
  note?: string;
}

export interface InventorySummary {
  itemsTotal: number;
  stockValue: number;
  unitsSoldInPeriod: number;
  revenueInPeriod: number;
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
  purchaseOrders: PurchaseOrder[];
  inventoryItems: InventoryItem[];
  stockMovements: StockMovement[];
  salaryGridSubmissions: SalaryGridSubmission[];
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
  /** Sum of unpaid balances still owed for the period (fees invoiced but not yet collected). */
  totalOutstanding: number;
  totalSalariesSent: number;
  totalSalariesDraft: number;
  totalExpenses: number;
  totalOutflow: number;
  netBalance: number;
}

/**
 * Network-wide "Intendance" (uniforms/supplies) figures for one school, used
 * by the promoter's consolidated dashboard — same shape of question as the
 * financial report, but for physical stock instead of money.
 */
export interface NetworkInventorySchoolSummary {
  schoolId: string;
  schoolName: string;
  color: string;
  unitsDelivered: number;
  unitsSold: number;
  unitsOnHand: number;
  revenue: number;
  varianceCount: number;
}

export interface NetworkInventoryStockRow {
  category: InventoryCategory;
  itemLabel: string;
  delivered: number;
  sold: number;
  stock: number;
  revenue: number;
}

/** One stock movement, tagged with which school it belongs to, for the network-wide feed. */
export interface NetworkStockMovementRow {
  id: string;
  schoolId: string;
  schoolName: string;
  category: InventoryCategory;
  itemLabel: string;
  quantity: number;
  unitPrice?: number;
  amount?: number;
  date: string;
  note?: string;
  recordedBy?: string;
  recordedAt: number;
}

export interface NetworkInventoryOverview {
  period: string;
  summaries: NetworkInventorySchoolSummary[];
  stockByClient: Record<string, NetworkInventoryStockRow[]>;
  recentDeliveries: NetworkStockMovementRow[];
  recentSales: NetworkStockMovementRow[];
  variances: NetworkStockMovementRow[];
}

export type AuditAction =
  | "payment.add" | "payment.remove"
  | "fee_adjustment.set" | "fee_adjustment.remove"
  | "expense.add" | "expense.remove" | "expense.update"
  | "student.add" | "student.remove" | "student.update" | "student.restore" | "student.permanent_delete"
  | "employee.add" | "employee.remove" | "employee.update" | "employee.restore" | "employee.permanent_delete"
  | "department.add" | "department.remove" | "department.update"
  | "field.add" | "field.update" | "field.remove"
  | "payslip.generate" | "payslip.status" | "payslip.send" | "payslip.mark_all_sent" | "payslip.send_all" | "payslip.notify_ready"
  | "school.create" | "school.update" | "school.delete"
  | "user.create" | "user.remove" | "user.resend_invite"
  | "receipt.send" | "receipt_request.send" | "receipt_request.decline"
  | "purchase_order.submit" | "purchase_order.validate" | "purchase_order.reject" | "purchase_order.execute"
  | "inventory_item.add" | "inventory_item.remove" | "stock_movement.add"
  | "salary_grid.submit" | "salary_grid.apply" | "salary_grid.reject";

export type NotificationType =
  | "purchase_order.submitted"
  | "purchase_order.decided"
  | "salary_grid.submitted"
  | "salary_grid.decided"
  | "user.invited"
  | "payslips.ready_to_send";

/**
 * One row per recipient account — a notification fanned out to three
 * people (e.g. every super admin on a new purchase order) is three rows,
 * each with its own `read` state, rather than one row with a list of
 * readers. Simpler to query ("my unread count") at the cost of some
 * duplication, which is fine at this volume.
 */
export interface Notification {
  id: string;
  /** Which account this row is for. */
  userId: string;
  /** School this relates to, if any — absent for network-wide events. */
  schoolId?: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Where clicking the notification should take the user, e.g. "/purchase-orders". */
  link?: string;
  read: boolean;
  createdAt: number;
}

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
  joinDate?: string;
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
  cycle?: Cycle;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  monthlyFee: number | string;
  status?: StudentStatus;
  joinDate?: string;
  note?: string;
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
