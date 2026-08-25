import type { Role, FeeStatus, ExpenseCategory, PaymentMethod, AdjustmentReason, UserStatus, AuditAction, EmployeeStatus } from "./types";

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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  bank_transfer: "Virement bancaire",
  other: "Autre",
};

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "mobile_money", "bank_transfer", "other"];

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  social_case: "Cas social",
  discount: "Remise",
  other: "Autre",
};

export const ADJUSTMENT_REASONS: AdjustmentReason[] = ["social_case", "discount", "other"];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending: "En attente",
  active: "Actif",
};

export const RECEIPT_STATUS_LABELS: Record<"pending" | "sent" | "declined", string> = {
  pending: "En attente",
  sent: "Envoyé",
  declined: "Refusé",
};

export const RECEIPT_STATUS_PILL: Record<"pending" | "sent" | "declined", string> = {
  pending: "pill-draft",
  sent: "pill-sent",
  declined: "pill-inactive",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "payment.add": "Paiement enregistré",
  "payment.remove": "Paiement annulé",
  "fee_adjustment.set": "Ajustement de frais appliqué",
  "fee_adjustment.remove": "Ajustement de frais retiré",
  "expense.add": "Dépense ajoutée",
  "expense.remove": "Dépense supprimée",
  "expense.update": "Dépense modifiée",
  "student.add": "Élève ajouté",
  "student.remove": "Élève supprimé",
  "student.update": "Élève modifié",
  "employee.add": "Employé ajouté",
  "employee.remove": "Employé supprimé",
  "employee.update": "Employé modifié",
  "department.add": "Département ajouté",
  "department.remove": "Département supprimé",
  "department.update": "Département modifié",
  "field.add": "Champ de paie ajouté",
  "field.update": "Champ de paie modifié",
  "field.remove": "Champ de paie supprimé",
  "payslip.generate": "Fiches de paie générées",
  "payslip.status": "Statut de fiche modifié",
  "payslip.send": "Fiche envoyée",
  "payslip.mark_all_sent": "Toutes les fiches marquées envoyées",
  "payslip.send_all": "Toutes les fiches envoyées",
  "school.create": "École créée",
  "school.update": "École modifiée",
  "school.delete": "École supprimée",
  "user.create": "Compte créé",
  "user.remove": "Compte supprimé",
  "user.resend_invite": "Invitation renvoyée",
  "receipt.send": "Reçu envoyé",
  "receipt_request.send": "Demande de reçu traitée",
  "receipt_request.decline": "Demande de reçu refusée",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  Active: "Actif",
  "On Leave": "En congé",
  Inactive: "Inactif",
};

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ["Active", "On Leave", "Inactive"];
