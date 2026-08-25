import { getDb } from "./mongodb";
import { ensureSeeded } from "./seed";
import { uid } from "./uid";
import { computePayslip } from "./calc";
import { sendPayslipEmail, sendReceiptEmail } from "./mailer";
import { computeStudentsWithLedger, computeStudentPeriodLedger, currentPeriod } from "./fees";
import { assertValidEmail } from "./validation";
import type {
  School, SchoolInput, DepartmentInput, EmployeeInput, FieldInput, FieldCategory, PayslipStatus,
  StudentInput, PaymentInput, FeeAdjustmentInput, ExpenseInput, SchoolReport, Student, Payment, FeeAdjustment,
  ReceiptRequest, ReceiptRequestInput, SendReceiptInput, ReceiptRequestStatus, PublicSchool,
} from "./types";

async function collection() {
  await ensureSeeded();
  const db = await getDb();
  return db.collection<School>("schools");
}

function strip(doc: (School & { _id?: unknown }) | null): School | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as School;
}

export async function listSchools(): Promise<School[]> {
  const col = await collection();
  const docs = await col.find({}).sort({ name: 1 }).toArray();
  return docs.map((d) => strip(d) as School);
}

export async function getSchool(id: string): Promise<School | null> {
  const col = await collection();
  return strip(await col.findOne({ id }));
}

export async function createSchool({ name, domain, description, color }: SchoolInput): Promise<School> {
  const col = await collection();
  const cleanDomain = String(domain).trim().toLowerCase();
  const clash = await col.findOne({ domain: cleanDomain });
  if (clash) throw new Error("Another school already uses this domain.");
  const school: School = {
    id: uid("sch"),
    name: name.trim(),
    domain: cleanDomain,
    description: description || "",
    color: color || "#1F6E4D",
    departments: [],
    employees: [],
    fields: { earnings: [], deductions: [], info: [] },
    payslips: [],
    students: [],
    payments: [],
    feeAdjustments: [],
    expenses: [],
    receiptRequests: [],
  };
  await col.insertOne(school);
  return school;
}

export async function updateSchool(id: string, { name, domain, description, color }: Partial<SchoolInput>): Promise<School> {
  const col = await collection();
  const school = await col.findOne({ id });
  if (!school) throw new Error("School not found.");
  if (domain) {
    const clean = String(domain).trim().toLowerCase();
    const clash = await col.findOne({ id: { $ne: id }, domain: clean });
    if (clash) throw new Error("Another school already uses this domain.");
    school.domain = clean;
  }
  if (name) school.name = name.trim();
  if (description !== undefined) school.description = description;
  if (color) school.color = color;
  await col.replaceOne({ id }, school);
  return strip(school) as School;
}

export async function deleteSchool(id: string): Promise<void> {
  const col = await collection();
  const total = await col.countDocuments();
  if (total <= 1) throw new Error("You need at least one school.");
  const result = await col.deleteOne({ id });
  if (result.deletedCount === 0) throw new Error("School not found.");
}

// ---------- Departments ----------
export async function addDepartment(sid: string, { name, head, description }: DepartmentInput) {
  if (!name) throw new Error("Give the department a name.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const dept = { id: uid("dept"), name, head: head || "", description: description || "" };
  school.departments.push(dept);
  await col.replaceOne({ id: sid }, school);
  return dept;
}

export async function removeDepartment(sid: string, did: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  school.departments = school.departments.filter((d) => d.id !== did);
  await col.replaceOne({ id: sid }, school);
}

export async function updateDepartment(sid: string, did: string, { name, head, description }: DepartmentInput) {
  if (!name) throw new Error("Give the department a name.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const dept = school.departments.find((d) => d.id === did);
  if (!dept) throw new Error("Department not found.");
  dept.name = name;
  dept.head = head || "";
  dept.description = description || "";
  await col.replaceOne({ id: sid }, school);
  return dept;
}

// ---------- Employees ----------
export async function addEmployee(sid: string, { name, position, department, baseSalary, status }: EmployeeInput) {
  if (!name || !position || !department || !baseSalary) {
    throw new Error("Fill in name, position, department, and base salary.");
  }
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const email = `${String(name).toLowerCase().replace(/[^a-z ]/g, "").split(" ").join(".")}@${school.domain}`;
  const employee = {
    id: uid("emp"), name, position, department, baseSalary: Number(baseSalary),
    status: status || "Active", email, joinDate: new Date().toISOString().slice(0, 10),
  } as School["employees"][number];
  school.employees.push(employee);
  await col.replaceOne({ id: sid }, school);
  return employee;
}

export async function removeEmployee(sid: string, eid: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  school.employees = school.employees.filter((e) => e.id !== eid);
  await col.replaceOne({ id: sid }, school);
}

export async function updateEmployee(sid: string, eid: string, { name, position, department, baseSalary, status }: EmployeeInput) {
  if (!name || !position || !department || !baseSalary) {
    throw new Error("Fill in name, position, department, and base salary.");
  }
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const employee = school.employees.find((e) => e.id === eid);
  if (!employee) throw new Error("Employee not found.");
  employee.name = name;
  employee.position = position;
  employee.department = department;
  employee.baseSalary = Number(baseSalary);
  if (status) employee.status = status;
  await col.replaceOne({ id: sid }, school);
  return employee;
}

// ---------- Fields ----------
export async function addField(sid: string, category: FieldCategory, { label, type, value, required }: FieldInput) {
  if (!["earnings", "deductions", "info"].includes(category)) throw new Error("Unknown field category.");
  if (!label) throw new Error("Give this field a label.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const field: School["fields"]["earnings"][number] = { id: uid("f"), label, required: !!required };
  if (category !== "info") {
    field.type = type === "percent" ? "percent" : "fixed";
    field.value = Number(value) || 0;
  }
  school.fields[category].push(field);
  await col.replaceOne({ id: sid }, school);
  return field;
}

export async function updateField(sid: string, category: FieldCategory, fid: string, { label, type, value, required }: FieldInput) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const list = school.fields[category];
  const idx = list.findIndex((f) => f.id === fid);
  if (idx === -1) throw new Error("Field not found.");
  if (label) list[idx].label = label;
  if (required !== undefined) list[idx].required = !!required;
  if (category !== "info") {
    if (type) list[idx].type = type;
    if (value !== undefined) list[idx].value = Number(value);
  }
  await col.replaceOne({ id: sid }, school);
  return list[idx];
}

export async function removeField(sid: string, category: FieldCategory, fid: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  school.fields[category] = school.fields[category].filter((f) => f.id !== fid);
  await col.replaceOne({ id: sid }, school);
}

// ---------- Payslips ----------
export async function listPayslips(sid: string, period?: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  return period ? school.payslips.filter((p) => p.period === period) : school.payslips;
}

export async function generatePayslips(sid: string, period: string) {
  if (!period) throw new Error("Choose a pay period.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const already = new Set(school.payslips.filter((p) => p.period === period).map((p) => p.employeeId));
  const targets = school.employees.filter((e) => e.status !== "Inactive" && !already.has(e.id));
  const created = targets.map((emp) => {
    const calc = computePayslip(emp, school.fields);
    return { id: uid("ps"), employeeId: emp.id, period, status: "draft" as PayslipStatus, generatedAt: Date.now(), ...calc };
  });
  school.payslips.push(...created);
  await col.replaceOne({ id: sid }, school);
  return created;
}

export async function setPayslipStatus(sid: string, pid: string, status: PayslipStatus) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const slip = school.payslips.find((p) => p.id === pid);
  if (!slip) throw new Error("Payslip not found.");
  if (status) slip.status = status;
  await col.replaceOne({ id: sid }, school);
  return slip;
}

export async function markAllSent(sid: string, period: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  school.payslips.forEach((p) => {
    if (p.period === period) p.status = "sent";
  });
  await col.replaceOne({ id: sid }, school);
}

export async function sendPayslip(sid: string, pid: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const slip = school.payslips.find((p) => p.id === pid);
  if (!slip) throw new Error("Payslip not found.");
  const employee = school.employees.find((e) => e.id === slip.employeeId);
  if (!employee) throw new Error("Employee not found.");
  const result = await sendPayslipEmail({
    to: employee.email, employeeName: employee.name, schoolName: school.name,
    period: slip.period, net: slip.net,
  });
  slip.status = "sent";
  await col.replaceOne({ id: sid }, school);
  return result;
}

export interface SendAllDraftsFailure {
  payslipId: string;
  employeeName: string;
  reason: string;
}

export interface SendAllDraftsResult {
  sent: number;
  attempted: number;
  simulated: boolean;
  failures: SendAllDraftsFailure[];
}

export async function sendAllDrafts(sid: string, period: string): Promise<SendAllDraftsResult> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const drafts = school.payslips.filter((p) => p.period === period && p.status === "draft");
  let simulated = false;
  let sentCount = 0;
  const failures: SendAllDraftsFailure[] = [];
  for (const slip of drafts) {
    const employee = school.employees.find((e) => e.id === slip.employeeId);
    if (!employee) {
      failures.push({ payslipId: slip.id, employeeName: "—", reason: "Employé introuvable." });
      continue;
    }
    try {
      const result = await sendPayslipEmail({
        to: employee.email, employeeName: employee.name, schoolName: school.name,
        period: slip.period, net: slip.net,
      });
      simulated = simulated || result.simulated;
      slip.status = "sent";
      sentCount += 1;
    } catch (err) {
      // The bug this replaces: silently swallowing here meant the caller
      // was told everyone was sent even when some genuinely weren't. Every
      // failure is now named, with a reason, and the true count is what's
      // reported — never the attempted count.
      failures.push({ payslipId: slip.id, employeeName: employee.name, reason: (err as Error).message || "Échec de l'envoi." });
    }
  }
  await col.replaceOne({ id: sid }, school);
  return { sent: sentCount, attempted: drafts.length, simulated, failures };
}

// ---------- Students & fees ----------
export async function listStudents(sid: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  return school.students;
}

export async function listStudentsWithLedger(sid: string, period: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  return computeStudentsWithLedger(school.students, school.payments, school.feeAdjustments, period);
}

export async function addStudent(sid: string, { name, className, guardianName, guardianPhone, guardianEmail, monthlyFee }: StudentInput) {
  if (!name || !className || !monthlyFee) throw new Error("Fill in the student's name, class, and monthly fee.");
  // Guardian email is optional at this point — a student can be added before
  // the school has contact details — but if one is given, it has to be a
  // real address, since it's what a receipt would later be sent to.
  const cleanGuardianEmail = guardianEmail?.trim() ? assertValidEmail(guardianEmail, "L'email du tuteur") : "";
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const newStudent: Student = {
    id: uid("stu"), name, className, monthlyFee: Number(monthlyFee),
    guardianName: guardianName || "", guardianPhone: guardianPhone || "", guardianEmail: cleanGuardianEmail,
  };
  school.students.push(newStudent);
  await col.replaceOne({ id: sid }, school);
  return newStudent;
}

export async function removeStudent(sid: string, stid: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  school.students = school.students.filter((s) => s.id !== stid);
  // Cascade: a removed student's ledger entries no longer belong to anyone.
  school.payments = school.payments.filter((p) => p.studentId !== stid);
  school.feeAdjustments = school.feeAdjustments.filter((a) => a.studentId !== stid);
  await col.replaceOne({ id: sid }, school);
}

export async function updateStudent(sid: string, stid: string, { name, className, guardianName, guardianPhone, guardianEmail, monthlyFee }: StudentInput) {
  if (!name || !className || !monthlyFee) throw new Error("Fill in the student's name, class, and monthly fee.");
  const cleanGuardianEmail = guardianEmail?.trim() ? assertValidEmail(guardianEmail, "L'email du tuteur") : "";
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const student = school.students.find((s) => s.id === stid);
  if (!student) throw new Error("Student not found.");
  student.name = name;
  student.className = className;
  // A changed monthlyFee only affects periods computed from here on — past
  // payments and fee adjustments already recorded keep whatever amountDue
  // was true at the time, which is exactly what a real ledger should do.
  student.monthlyFee = Number(monthlyFee);
  student.guardianName = guardianName || "";
  student.guardianPhone = guardianPhone || "";
  student.guardianEmail = cleanGuardianEmail;
  await col.replaceOne({ id: sid }, school);
  return student;
}

// ---------- Payments (the ledger itself — every entry is a real, individual transaction) ----------
export async function getStudentLedger(sid: string, stid: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const student = school.students.find((s) => s.id === stid);
  if (!student) throw new Error("Student not found.");
  const payments = school.payments.filter((p) => p.studentId === stid).sort((a, b) => b.recordedAt - a.recordedAt);
  const adjustments = school.feeAdjustments.filter((a) => a.studentId === stid).sort((a, b) => b.createdAt - a.createdAt);
  return { student, payments, adjustments };
}

export async function addPayment(sid: string, stid: string, { period, amount, date, method, note }: PaymentInput, recordedBy?: string) {
  if (!period || !amount || Number(amount) <= 0) throw new Error("Choose a period and enter a payment amount above zero.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const student = school.students.find((s) => s.id === stid);
  if (!student) throw new Error("Student not found.");
  const payment: Payment = {
    id: uid("pay"), studentId: stid, period, amount: Number(amount),
    date: date || new Date().toISOString().slice(0, 10),
    method: method || "cash", note, recordedBy, recordedAt: Date.now(),
  };
  school.payments.push(payment);
  await col.replaceOne({ id: sid }, school);
  return payment;
}

export async function removePayment(sid: string, pid: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const exists = school.payments.some((p) => p.id === pid);
  if (!exists) throw new Error("Payment not found.");
  school.payments = school.payments.filter((p) => p.id !== pid);
  await col.replaceOne({ id: sid }, school);
}

// ---------- Fee adjustments (social cases, discounts — override the amount due for one period) ----------
export async function setFeeAdjustment(sid: string, stid: string, { period, amountDue, reason, note }: FeeAdjustmentInput, recordedBy?: string) {
  if (!period) throw new Error("Choose a period.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const student = school.students.find((s) => s.id === stid);
  if (!student) throw new Error("Student not found.");
  const existingIdx = school.feeAdjustments.findIndex((a) => a.studentId === stid && a.period === period);
  const adjustment: FeeAdjustment = {
    id: existingIdx >= 0 ? school.feeAdjustments[existingIdx].id : uid("adj"),
    studentId: stid, period, amountDue: Number(amountDue), reason, note, recordedBy,
    createdAt: existingIdx >= 0 ? school.feeAdjustments[existingIdx].createdAt : Date.now(),
  };
  if (existingIdx >= 0) school.feeAdjustments[existingIdx] = adjustment;
  else school.feeAdjustments.push(adjustment);
  await col.replaceOne({ id: sid }, school);
  return adjustment;
}

export async function removeFeeAdjustment(sid: string, aid: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  school.feeAdjustments = school.feeAdjustments.filter((a) => a.id !== aid);
  await col.replaceOne({ id: sid }, school);
}

// ---------- Expenses ----------
export async function listExpenses(sid: string, period?: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  return period ? school.expenses.filter((e) => e.period === period) : school.expenses;
}

export async function addExpense(sid: string, { category, label, amount, period, date, note }: ExpenseInput, addedBy?: string) {
  if (!category || !label || !amount || !period) throw new Error("Fill in the category, label, amount, and period.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const newExpense = {
    id: uid("exp"), category, label, amount: Number(amount), period,
    date: date || new Date().toISOString().slice(0, 10), note, addedBy, createdAt: Date.now(),
  };
  school.expenses.push(newExpense);
  await col.replaceOne({ id: sid }, school);
  return newExpense;
}

export async function removeExpense(sid: string, eid: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  school.expenses = school.expenses.filter((e) => e.id !== eid);
  await col.replaceOne({ id: sid }, school);
}

export async function updateExpense(sid: string, eid: string, { category, label, amount, period, date, note }: ExpenseInput) {
  if (!category || !label || !amount || !period) throw new Error("Fill in the category, label, amount, and period.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const expense = school.expenses.find((e) => e.id === eid);
  if (!expense) throw new Error("Expense not found.");
  expense.category = category;
  expense.label = label;
  expense.amount = Number(amount);
  expense.period = period;
  if (date) expense.date = date;
  expense.note = note;
  await col.replaceOne({ id: sid }, school);
  return expense;
}

// ---------- Reports ----------
export function computeSchoolReport(school: School, period: string): SchoolReport {
  // Enrollment status is a snapshot-in-time concept: "all periods" falls back
  // to the most recent period rather than trying to merge statuses together.
  const statusPeriod = period === "all" ? currentPeriod() : period;
  const ledgers = computeStudentsWithLedger(school.students, school.payments, school.feeAdjustments, statusPeriod).map((s) => s.ledger);

  const studentsPaid = ledgers.filter((l) => l.status === "paid").length;
  const studentsPartial = ledgers.filter((l) => l.status === "partial").length;
  const studentsSocialCase = ledgers.filter((l) => l.status === "social_case").length;
  const studentsUnpaid = ledgers.filter((l) => l.status === "unpaid").length;

  const totalDue = ledgers.reduce((s, l) => s + l.amountDue, 0);

  // Money actually collected is a real sum over the ledger — every period's
  // worth of payments if "all", or just the payments logged in this period.
  const incomePayments = period === "all" ? school.payments : school.payments.filter((p) => p.period === period);
  const totalIncome = incomePayments.reduce((s, p) => s + p.amount, 0);

  const inPeriod = <T extends { period: string }>(items: T[]) => (period === "all" ? items : items.filter((i) => i.period === period));
  const periodPayslips = inPeriod(school.payslips);
  const totalSalariesSent = periodPayslips.filter((p) => p.status === "sent").reduce((s, p) => s + p.net, 0);
  const totalSalariesDraft = periodPayslips.filter((p) => p.status === "draft").reduce((s, p) => s + p.net, 0);

  const periodExpenses = inPeriod(school.expenses);
  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);

  const totalOutflow = totalSalariesSent + totalExpenses;

  return {
    schoolId: school.id,
    schoolName: school.name,
    color: school.color,
    period,
    studentsTotal: school.students.length,
    studentsPaid,
    studentsPartial,
    studentsUnpaid,
    studentsSocialCase,
    totalDue,
    totalIncome,
    totalSalariesSent,
    totalSalariesDraft,
    totalExpenses,
    totalOutflow,
    netBalance: totalIncome - totalOutflow,
  };
}

export async function getSchoolReport(sid: string, period: string): Promise<SchoolReport> {
  const school = await getSchool(sid);
  if (!school) throw new Error("School not found.");
  return computeSchoolReport(school, period);
}

export async function getAllReports(period: string): Promise<SchoolReport[]> {
  const schools = await listSchools();
  return schools.map((s) => computeSchoolReport(s, period));
}

// ---------- Receipt requests (parents have no account — this is their only path to a copy) ----------
export async function listSchoolsPublic(): Promise<PublicSchool[]> {
  const col = await collection();
  const docs = await col.find({}, { projection: { id: 1, name: 1, color: 1 } }).sort({ name: 1 }).toArray();
  return docs.map((d) => ({ id: d.id, name: d.name, color: d.color }));
}

export async function addReceiptRequest(sid: string, input: ReceiptRequestInput): Promise<ReceiptRequest> {
  const { studentName, className, period, guardianName, guardianEmail, guardianPhone, note } = input;
  if (!studentName?.trim() || !period || !guardianName?.trim() || !guardianEmail?.trim()) {
    throw new Error("Merci de renseigner le nom de l'élève, la période, votre nom et votre email.");
  }
  const cleanGuardianEmail = assertValidEmail(guardianEmail, "Votre email");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const request: ReceiptRequest = {
    id: uid("req"),
    studentName: studentName.trim(),
    className: className?.trim() || undefined,
    period,
    guardianName: guardianName.trim(),
    guardianEmail: cleanGuardianEmail,
    guardianPhone: guardianPhone?.trim() || undefined,
    note: note?.trim() || undefined,
    status: "pending",
    createdAt: Date.now(),
  };
  school.receiptRequests.push(request);
  await col.replaceOne({ id: sid }, school);
  return request;
}

export async function listReceiptRequests(sid: string, status?: ReceiptRequestStatus) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const list = school.receiptRequests.slice().sort((a, b) => b.createdAt - a.createdAt);
  return status ? list.filter((r) => r.status === status) : list;
}

/**
 * Sends a copy of a student's payment history for one period to a guardian.
 * Used both for a formal parent request (requestId provided, gets marked
 * resolved) and for an admin proactively sending a receipt from a student's
 * ledger (no requestId).
 */
export async function sendReceipt(
  sid: string,
  studentId: string,
  { period, guardianEmail, guardianName }: SendReceiptInput,
  resolvedBy?: string,
  requestId?: string
) {
  if (!guardianEmail?.trim()) throw new Error("Enter an email address to send the receipt to.");
  const cleanGuardianEmail = assertValidEmail(guardianEmail, "L'email du destinataire");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const student = school.students.find((s) => s.id === studentId);
  if (!student) throw new Error("Student not found.");

  const ledger = computeStudentPeriodLedger(student, school.payments, school.feeAdjustments, period);
  const result = await sendReceiptEmail({
    to: cleanGuardianEmail,
    guardianName: guardianName?.trim() || student.guardianName || "Parent",
    studentName: student.name,
    className: student.className,
    schoolName: school.name,
    period,
    payments: ledger.payments.map((p) => ({ date: p.date, amount: p.amount, method: p.method })),
    totalPaid: ledger.amountPaid,
    amountDue: ledger.amountDue,
  });

  if (requestId) {
    const req = school.receiptRequests.find((r) => r.id === requestId);
    if (req) {
      req.status = "sent";
      req.resolvedAt = Date.now();
      req.resolvedBy = resolvedBy;
      req.linkedStudentId = studentId;
    }
  }
  await col.replaceOne({ id: sid }, school);
  return result;
}

export async function declineReceiptRequest(sid: string, rid: string, resolvedBy?: string): Promise<void> {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const req = school.receiptRequests.find((r) => r.id === rid);
  if (!req) throw new Error("Request not found.");
  req.status = "declined";
  req.resolvedAt = Date.now();
  req.resolvedBy = resolvedBy;
  await col.replaceOne({ id: sid }, school);
}
