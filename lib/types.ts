export type EmployeeStatus = "Active" | "On Leave" | "Inactive";
export type PayslipStatus = "draft" | "sent";
export type FieldType = "fixed" | "percent";
export type FieldCategory = "earnings" | "deductions" | "info";
export type Role = "super_admin" | "promoter" | "school_admin" | "finance" | "teacher";
export type FeeStatus = "paid" | "partial" | "unpaid" | "social_case";
export type ExpenseCategory = "fuel" | "credit" | "renovation" | "supplies" | "utilities" | "maintenance" | "other";

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

export interface FeeRecord {
  id: string;
  period: string;
  amountDue: number;
  amountPaid: number;
  status: FeeStatus;
  recordedAt: number;
  recordedBy?: string;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  guardianName?: string;
  guardianPhone?: string;
  monthlyFee: number;
  status: FeeStatus;
  records: FeeRecord[];
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
  expenses: Expense[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  schoolId?: string;
  employeeId?: string;
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
  monthlyFee: number | string;
}

export interface FeeRecordInput {
  period: string;
  amountDue: number | string;
  amountPaid: number | string;
  status: FeeStatus;
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
  password: string;
  role: Role;
  schoolId?: string;
  employeeId?: string;
}
