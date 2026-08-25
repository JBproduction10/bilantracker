import type {
  School, Department, Employee, FieldItem, FieldCategory, Payslip, PayslipStatus,
  Student, StudentWithLedger, Payment, FeeAdjustment, PaymentInput, FeeAdjustmentInput,
  Expense, SchoolReport, AppUser, UserInput,
  ReceiptRequest, ReceiptRequestInput, SendReceiptInput, ReceiptRequestStatus, PublicSchool,
  AuditEntry, SendAllDraftsResponse,
} from "./types";

const BASE = "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    method: options.method,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

export interface MyPayslipsResponse {
  payslips: Payslip[];
  school: { name: string; color: string } | null;
  employee: Employee | null;
}

export const api = {
  listSchools: () => request<School[]>("/schools"),
  addSchool: (body: Partial<School>) => request<School>("/schools", { method: "POST", body }),
  updateSchool: (id: string, body: Partial<School>) => request<School>(`/schools/${id}`, { method: "PUT", body }),
  removeSchool: (id: string) => request<null>(`/schools/${id}`, { method: "DELETE" }),

  addDepartment: (sid: string, body: Partial<Department>) =>
    request<Department>(`/schools/${sid}/departments`, { method: "POST", body }),
  updateDepartment: (sid: string, did: string, body: Partial<Department>) =>
    request<Department>(`/schools/${sid}/departments/${did}`, { method: "PUT", body }),
  removeDepartment: (sid: string, did: string) =>
    request<null>(`/schools/${sid}/departments/${did}`, { method: "DELETE" }),

  addEmployee: (sid: string, body: Partial<Employee>) =>
    request<Employee>(`/schools/${sid}/employees`, { method: "POST", body }),
  updateEmployee: (sid: string, eid: string, body: Partial<Employee>) =>
    request<Employee>(`/schools/${sid}/employees/${eid}`, { method: "PUT", body }),
  removeEmployee: (sid: string, eid: string) =>
    request<null>(`/schools/${sid}/employees/${eid}`, { method: "DELETE" }),

  addField: (sid: string, category: FieldCategory, body: Partial<FieldItem>) =>
    request<FieldItem>(`/schools/${sid}/fields/${category}`, { method: "POST", body }),
  updateField: (sid: string, category: FieldCategory, fid: string, body: Partial<FieldItem>) =>
    request<FieldItem>(`/schools/${sid}/fields/${category}/${fid}`, { method: "PUT", body }),
  removeField: (sid: string, category: FieldCategory, fid: string) =>
    request<null>(`/schools/${sid}/fields/${category}/${fid}`, { method: "DELETE" }),

  listPayslips: (sid: string, period: string) =>
    request<Payslip[]>(`/schools/${sid}/payslips?period=${encodeURIComponent(period)}`),
  generatePayslips: (sid: string, period: string) =>
    request<Payslip[]>(`/schools/${sid}/payslips/generate`, { method: "POST", body: { period } }),
  setPayslipStatus: (sid: string, pid: string, status: PayslipStatus) =>
    request<Payslip>(`/schools/${sid}/payslips/${pid}`, { method: "PATCH", body: { status } }),
  markAllSent: (sid: string, period: string) =>
    request<{ ok: boolean }>(`/schools/${sid}/payslips/mark-all-sent`, { method: "POST", body: { period } }),
  sendPayslip: (sid: string, pid: string) =>
    request<{ ok: boolean; simulated: boolean }>(`/schools/${sid}/payslips/${pid}/send`, { method: "POST" }),
  sendAllDrafts: (sid: string, period: string) =>
    request<SendAllDraftsResponse>(`/schools/${sid}/payslips/send-all`, {
      method: "POST",
      body: { period },
    }),

  listStudents: (sid: string, period: string) =>
    request<StudentWithLedger[]>(`/schools/${sid}/students?period=${encodeURIComponent(period)}`),
  addStudent: (sid: string, body: Partial<Student>) =>
    request<Student>(`/schools/${sid}/students`, { method: "POST", body }),
  updateStudent: (sid: string, stid: string, body: Partial<Student>) =>
    request<Student>(`/schools/${sid}/students/${stid}`, { method: "PUT", body }),
  removeStudent: (sid: string, stid: string) =>
    request<null>(`/schools/${sid}/students/${stid}`, { method: "DELETE" }),

  getStudentLedger: (sid: string, stid: string) =>
    request<{ student: Student; payments: Payment[]; adjustments: FeeAdjustment[] }>(`/schools/${sid}/students/${stid}/ledger`),
  addPayment: (sid: string, stid: string, body: PaymentInput) =>
    request<Payment>(`/schools/${sid}/students/${stid}/payments`, { method: "POST", body }),
  removePayment: (sid: string, stid: string, pid: string) =>
    request<null>(`/schools/${sid}/students/${stid}/payments/${pid}`, { method: "DELETE" }),
  setFeeAdjustment: (sid: string, stid: string, body: FeeAdjustmentInput) =>
    request<FeeAdjustment>(`/schools/${sid}/students/${stid}/adjustments`, { method: "POST", body }),
  removeFeeAdjustment: (sid: string, stid: string, aid: string) =>
    request<null>(`/schools/${sid}/students/${stid}/adjustments/${aid}`, { method: "DELETE" }),

  listExpenses: (sid: string, period: string) =>
    request<Expense[]>(`/schools/${sid}/expenses?period=${encodeURIComponent(period)}`),
  addExpense: (sid: string, body: Partial<Expense>) =>
    request<Expense>(`/schools/${sid}/expenses`, { method: "POST", body }),
  updateExpense: (sid: string, eid: string, body: Partial<Expense>) =>
    request<Expense>(`/schools/${sid}/expenses/${eid}`, { method: "PUT", body }),
  removeExpense: (sid: string, eid: string) =>
    request<null>(`/schools/${sid}/expenses/${eid}`, { method: "DELETE" }),

  getSchoolReport: (sid: string, period: string) =>
    request<SchoolReport>(`/schools/${sid}/report?period=${encodeURIComponent(period)}`),
  getAllReports: (period: string) =>
    request<SchoolReport[]>(`/reports?period=${encodeURIComponent(period)}`),

  listUsers: () => request<Omit<AppUser, "passwordHash" | "inviteToken">[]>("/users"),
  createUser: (body: UserInput) =>
    request<Omit<AppUser, "passwordHash" | "inviteToken"> & { _invite: { simulated: boolean } }>("/users", { method: "POST", body }),
  removeUser: (uid: string) => request<null>(`/users/${uid}`, { method: "DELETE" }),
  resendInvite: (uid: string) => request<{ simulated: boolean }>(`/users/${uid}/resend-invite`, { method: "POST" }),

  myPayslips: () => request<MyPayslipsResponse>("/me/payslips"),

  listSchoolsPublic: () => request<PublicSchool[]>("/public/schools"),
  submitReceiptRequest: (sid: string, body: ReceiptRequestInput) =>
    request<ReceiptRequest>(`/schools/${sid}/receipt-requests`, { method: "POST", body }),
  listReceiptRequests: (sid: string, status?: ReceiptRequestStatus) =>
    request<ReceiptRequest[]>(`/schools/${sid}/receipt-requests${status ? `?status=${status}` : ""}`),
  sendReceiptForRequest: (sid: string, rid: string, body: { studentId: string; guardianEmail?: string; guardianName?: string }) =>
    request<{ ok: boolean; simulated: boolean }>(`/schools/${sid}/receipt-requests/${rid}/send`, { method: "POST", body }),
  declineReceiptRequest: (sid: string, rid: string) =>
    request<{ ok: boolean }>(`/schools/${sid}/receipt-requests/${rid}/decline`, { method: "POST" }),
  sendStudentReceipt: (sid: string, stid: string, body: SendReceiptInput) =>
    request<{ ok: boolean; simulated: boolean }>(`/schools/${sid}/students/${stid}/send-receipt`, { method: "POST", body }),

  listAuditLogs: (schoolId?: string) =>
    request<AuditEntry[]>(`/audit-logs${schoolId ? `?schoolId=${schoolId}` : ""}`),
};
