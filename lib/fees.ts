import type { Student, Payment, FeeAdjustment, StudentPeriodLedger, FeeStatus } from "./types";
import { PERIODS } from "./utils";

/** The period treated as "now" when a report or status view asks for "all periods" — always the most recent one on the calendar. */
export function currentPeriod(): string {
  return PERIODS[PERIODS.length - 1];
}

export function findAdjustment(adjustments: FeeAdjustment[], studentId: string, period: string): FeeAdjustment | undefined {
  return adjustments.find((a) => a.studentId === studentId && a.period === period);
}

export function studentPeriodPayments(payments: Payment[], studentId: string, period: string): Payment[] {
  return payments.filter((p) => p.studentId === studentId && p.period === period);
}

/**
 * The core of the ledger: a student's position for one period is always
 * computed from the sum of their individual payment transactions against
 * the amount due (monthly fee, or an explicit adjustment) — never read
 * from a field someone typed in and could silently overwrite.
 */
export function computeStudentPeriodLedger(
  student: Student,
  payments: Payment[],
  adjustments: FeeAdjustment[],
  period: string
): StudentPeriodLedger {
  const adjustment = findAdjustment(adjustments, student.id, period);
  const amountDue = adjustment ? adjustment.amountDue : student.monthlyFee;
  const periodPayments = studentPeriodPayments(payments, student.id, period);
  const amountPaid = periodPayments.reduce((s, p) => s + p.amount, 0);
  const balance = amountDue - amountPaid;

  let status: FeeStatus;
  if (adjustment?.reason === "social_case") status = "social_case";
  else if (amountPaid <= 0) status = "unpaid";
  else if (balance <= 0) status = "paid";
  else status = "partial";

  return {
    studentId: student.id,
    period,
    amountDue,
    amountPaid,
    balance,
    status,
    isAdjusted: !!adjustment,
    adjustmentReason: adjustment?.reason,
    payments: periodPayments.sort((a, b) => b.recordedAt - a.recordedAt),
  };
}

export function computeStudentsWithLedger(
  students: Student[],
  payments: Payment[],
  adjustments: FeeAdjustment[],
  period: string
) {
  return students.map((s) => ({ ...s, ledger: computeStudentPeriodLedger(s, payments, adjustments, period) }));
}
