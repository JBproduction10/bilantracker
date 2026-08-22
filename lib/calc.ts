import type { Employee, Fields, PayslipRow } from "./types";

export interface PayslipCalculation {
  earningsRows: PayslipRow[];
  gross: number;
  deductionsRows: PayslipRow[];
  totalDeductions: number;
  net: number;
}

export function computePayslip(employee: Employee, fields: Fields): PayslipCalculation {
  const earningsRows: PayslipRow[] = [{ label: "Basic Salary", amount: employee.baseSalary }];
  fields.earnings.forEach((f) => {
    const amt = f.type === "percent" ? Math.round((employee.baseSalary * (f.value || 0)) / 100) : f.value || 0;
    earningsRows.push({ label: f.label, amount: amt });
  });
  const gross = earningsRows.reduce((s, r) => s + r.amount, 0);
  const deductionsRows: PayslipRow[] = fields.deductions.map((f) => {
    const amt = f.type === "percent" ? Math.round((gross * (f.value || 0)) / 100) : f.value || 0;
    return { label: f.label, amount: amt };
  });
  const totalDeductions = deductionsRows.reduce((s, r) => s + r.amount, 0);
  return { earningsRows, gross, deductionsRows, totalDeductions, net: gross - totalDeductions };
}
