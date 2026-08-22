import type {
  School, Department, Employee, FieldItem, FieldCategory, Payslip, PayslipStatus,
  Student, Expense, SchoolReport, AppUser, UserInput,
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
  removeDepartment: (sid: string, did: string) =>
    request<null>(`/schools/${sid}/departments/${did}`, { method: "DELETE" }),

  addEmployee: (sid: string, body: Partial<Employee>) =>
    request<Employee>(`/schools/${sid}/employees`, { method: "POST", body }),
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
    request<{ ok: boolean; sent: number; simulated: boolean }>(`/schools/${sid}/payslips/send-all`, {
      method: "POST",
      body: { period },
    }),

  listStudents: (sid: string) => request<Student[]>(`/schools/${sid}/students`),
  addStudent: (sid: string, body: Partial<Student>) =>
    request<Student>(`/schools/${sid}/students`, { method: "POST", body }),
  removeStudent: (sid: string, stid: string) =>
    request<null>(`/schools/${sid}/students/${stid}`, { method: "DELETE" }),
  recordFeePayment: (sid: string, stid: string, body: { period: string; amountDue: number | string; amountPaid: number | string; status: string }) =>
    request<Student>(`/schools/${sid}/students/${stid}/records`, { method: "POST", body }),

  listExpenses: (sid: string, period: string) =>
    request<Expense[]>(`/schools/${sid}/expenses?period=${encodeURIComponent(period)}`),
  addExpense: (sid: string, body: Partial<Expense>) =>
    request<Expense>(`/schools/${sid}/expenses`, { method: "POST", body }),
  removeExpense: (sid: string, eid: string) =>
    request<null>(`/schools/${sid}/expenses/${eid}`, { method: "DELETE" }),

  getSchoolReport: (sid: string, period: string) =>
    request<SchoolReport>(`/schools/${sid}/report?period=${encodeURIComponent(period)}`),
  getAllReports: (period: string) =>
    request<SchoolReport[]>(`/reports?period=${encodeURIComponent(period)}`),

  listUsers: () => request<Omit<AppUser, "passwordHash">[]>("/users"),
  createUser: (body: UserInput) => request<Omit<AppUser, "passwordHash">>("/users", { method: "POST", body }),
  removeUser: (uid: string) => request<null>(`/users/${uid}`, { method: "DELETE" }),

  myPayslips: () => request<MyPayslipsResponse>("/me/payslips"),
};
