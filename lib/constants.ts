import type { Role, FeeStatus, ExpenseCategory } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  promoter: "Promoter",
  school_admin: "School Admin",
  finance: "Finance",
  teacher: "Teacher",
};

export const FEE_STATUS_LABELS: Record<FeeStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Not Paid",
  social_case: "Social Case",
};

export const FEE_STATUS_PILL: Record<FeeStatus, string> = {
  paid: "pill-sent",
  partial: "pill-leave",
  unpaid: "pill-draft",
  social_case: "pill-inactive",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  credit: "Credit / Loan",
  renovation: "Renovation",
  supplies: "Supplies",
  utilities: "Utilities",
  maintenance: "Maintenance",
  other: "Other",
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "fuel", "credit", "renovation", "supplies", "utilities", "maintenance", "other",
];

export const ROLES: Role[] = ["super_admin", "promoter", "school_admin", "finance", "teacher"];
