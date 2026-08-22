import { getDb } from "./mongodb";
import { ensureSeeded } from "./seed";
import { uid } from "./uid";
import { computePayslip } from "./calc";
import { sendPayslipEmail } from "./mailer";
import type {
  School, SchoolInput, DepartmentInput, EmployeeInput, FieldInput, FieldCategory, PayslipStatus,
  StudentInput, FeeRecordInput, ExpenseInput, SchoolReport,
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
    expenses: [],
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

export async function sendAllDrafts(sid: string, period: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const drafts = school.payslips.filter((p) => p.period === period && p.status === "draft");
  let simulated = false;
  for (const slip of drafts) {
    const employee = school.employees.find((e) => e.id === slip.employeeId);
    if (!employee) continue;
    try {
      const result = await sendPayslipEmail({
        to: employee.email, employeeName: employee.name, schoolName: school.name,
        period: slip.period, net: slip.net,
      });
      simulated = simulated || result.simulated;
      slip.status = "sent";
    } catch {
      // skip failures, keep going
    }
  }
  await col.replaceOne({ id: sid }, school);
  return { sent: drafts.length, simulated };
}

// ---------- Students & fees ----------
export async function listStudents(sid: string) {
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  return school.students;
}

export async function addStudent(sid: string, { name, className, guardianName, guardianPhone, monthlyFee }: StudentInput) {
  if (!name || !className || !monthlyFee) throw new Error("Fill in the student's name, class, and monthly fee.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const newStudent = {
    id: uid("stu"), name, className, monthlyFee: Number(monthlyFee),
    guardianName: guardianName || "", guardianPhone: guardianPhone || "",
    status: "unpaid" as const, records: [],
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
  await col.replaceOne({ id: sid }, school);
}

export async function recordFeePayment(sid: string, stid: string, { period, amountDue, amountPaid, status }: FeeRecordInput, recordedBy?: string) {
  if (!period) throw new Error("Choose a period.");
  const col = await collection();
  const school = await col.findOne({ id: sid });
  if (!school) throw new Error("School not found.");
  const student = school.students.find((s) => s.id === stid);
  if (!student) throw new Error("Student not found.");
  const existingIdx = student.records.findIndex((r) => r.period === period);
  const record = {
    id: existingIdx >= 0 ? student.records[existingIdx].id : uid("fee"),
    period, amountDue: Number(amountDue), amountPaid: Number(amountPaid), status,
    recordedAt: Date.now(), recordedBy,
  };
  if (existingIdx >= 0) student.records[existingIdx] = record;
  else student.records.push(record);
  student.status = status;
  await col.replaceOne({ id: sid }, school);
  return student;
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

// ---------- Reports ----------
export function computeSchoolReport(school: School, period: string): SchoolReport {
  const inPeriod = <T extends { period: string }>(items: T[]) => (period === "all" ? items : items.filter((i) => i.period === period));

  const feeRecordsByStudent = school.students.map((s) => {
    const records = inPeriod(s.records);
    return records[records.length - 1] || null;
  });

  const studentsPaid = feeRecordsByStudent.filter((r) => r?.status === "paid").length;
  const studentsPartial = feeRecordsByStudent.filter((r) => r?.status === "partial").length;
  const studentsSocialCase = feeRecordsByStudent.filter((r) => r?.status === "social_case").length;
  const studentsWithRecord = feeRecordsByStudent.filter((r) => r !== null).length;
  const studentsUnpaid = school.students.length - studentsPaid - studentsPartial - studentsSocialCase;

  const totalDue = feeRecordsByStudent.reduce((s, r) => s + (r?.amountDue || 0), 0);
  const totalIncome = feeRecordsByStudent.reduce((s, r) => s + (r?.amountPaid || 0), 0);

  const periodPayslips = inPeriod(school.payslips);
  const totalSalariesSent = periodPayslips.filter((p) => p.status === "sent").reduce((s, p) => s + p.net, 0);
  const totalSalariesDraft = periodPayslips.filter((p) => p.status === "draft").reduce((s, p) => s + p.net, 0);

  const periodExpenses = inPeriod(school.expenses);
  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);

  const totalOutflow = totalSalariesSent + totalExpenses;

  void studentsWithRecord;

  return {
    schoolId: school.id,
    schoolName: school.name,
    color: school.color,
    period,
    studentsTotal: school.students.length,
    studentsPaid,
    studentsPartial,
    studentsUnpaid: Math.max(studentsUnpaid, 0),
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
