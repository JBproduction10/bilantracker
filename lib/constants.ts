import type { Role, FeeStatus, ExpenseCategory, PaymentMethod, AdjustmentReason, UserStatus, AuditAction, EmployeeStatus, StudentStatus, PurchaseOrderStatus, InventoryCategory, StockMovementType, SalaryGridStatus } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  promoter: "Promoter",
  school_admin: "School Admin",
  cashier: "Cashier (Caisse)",
  finance: "Finance",
  teacher: "Teacher",
  treasury: "Bonté Service (Trésorerie)",
  logistics: "Intendance & Logistique",
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

export const ROLES: Role[] = ["super_admin", "promoter", "school_admin", "cashier", "finance", "teacher", "treasury", "logistics"];

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
  "student.remove": "Élève mis à la corbeille",
  "student.update": "Élève modifié",
  "student.restore": "Élève restauré",
  "student.permanent_delete": "Élève supprimé définitivement",
  "employee.add": "Employé ajouté",
  "employee.remove": "Employé mis à la corbeille",
  "employee.update": "Employé modifié",
  "employee.restore": "Employé restauré",
  "employee.permanent_delete": "Employé supprimé définitivement",
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
  "promoter.create": "Promoteur créé",
  "promoter.update": "Promoteur modifié",
  "promoter.delete": "Promoteur supprimé",
  "user.create": "Compte créé",
  "user.remove": "Compte supprimé",
  "user.resend_invite": "Invitation renvoyée",
  "receipt.send": "Reçu envoyé",
  "receipt_request.send": "Demande de reçu traitée",
  "receipt_request.decline": "Demande de reçu refusée",
  "purchase_order.submit": "Bon de commande soumis",
  "purchase_order.validate": "Bon de commande validé",
  "purchase_order.reject": "Bon de commande refusé",
  "purchase_order.execute": "Bon de commande exécuté",
  "inventory_item.add": "Article de stock ajouté",
  "inventory_item.remove": "Article de stock supprimé",
  "stock_movement.add": "Mouvement de stock enregistré",
  "salary_grid.submit": "Grille salariale envoyée",
  "salary_grid.apply": "Grille salariale appliquée et fiches générées",
  "salary_grid.reject": "Grille salariale refusée",
  "payslip.notify_ready": ""
};

export const SALARY_GRID_STATUS_LABELS: Record<SalaryGridStatus, string> = {
  pending: "En attente",
  applied: "Appliquée",
  rejected: "Refusée",
};

export const SALARY_GRID_STATUS_PILL: Record<SalaryGridStatus, string> = {
  pending: "pill-draft",
  applied: "pill-sent",
  rejected: "pill-inactive",
};

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: "En attente",
  validated: "Validé",
  rejected: "Refusé",
  executed: "Exécuté",
};

export const PURCHASE_ORDER_STATUS_PILL: Record<PurchaseOrderStatus, string> = {
  pending: "pill-draft",
  validated: "pill-leave",
  rejected: "pill-inactive",
  executed: "pill-sent",
};

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  uniform: "Uniformes",
  shoes: "Chaussures",
  sweater: "Pulls",
  supplies: "Fournitures",
  other: "Autre",
};

export const INVENTORY_CATEGORIES: InventoryCategory[] = ["uniform", "shoes", "sweater", "supplies", "other"];

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  in: "Entrée (réception)",
  sale: "Sortie (vente)",
  adjustment: "Ajustement d'inventaire",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  Active: "Actif",
  "On Leave": "En congé",
  Inactive: "Inactif",
};

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ["Active", "On Leave", "Inactive"];

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Actif",
  withdrawn: "Retiré",
};

export const STUDENT_STATUSES: StudentStatus[] = ["active", "withdrawn"];
