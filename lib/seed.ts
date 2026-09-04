import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";
import { uid } from "./uid";
import { computePayslip } from "./calc";
import type {
  School, EmployeeStatus, Fields, Student, Expense, ExpenseCategory, AppUser, Employee,
  Payment, FeeAdjustment, PaymentMethod, PurchaseOrder, PurchaseOrderStatus, InventoryItem, InventoryCategory, StockMovement,
  SalaryGridSubmission, SalaryGridStatus, Cycle,
} from "./types";

let seeded = false;

function defaultFields(): Fields {
  return {
    earnings: [
      { id: uid("f"), label: "Prime de logement", type: "fixed", value: 15000, required: false },
      { id: uid("f"), label: "Prime de transport", type: "fixed", value: 10000, required: false },
    ],
    deductions: [
      { id: uid("f"), label: "IRPP", type: "percent", value: 8, required: true },
      { id: uid("f"), label: "CNPS", type: "percent", value: 4, required: true },
    ],
    info: [
      { id: uid("f"), label: "Compte bancaire", required: true },
      { id: uid("f"), label: "N° CNPS", required: true },
    ],
  };
}

function emp(
  name: string,
  position: string,
  department: string,
  baseSalary: number,
  domain: string,
  status: EmployeeStatus = "Active"
): Employee {
  const email = name.toLowerCase().replace(/[^a-z ]/g, "").split(" ").join(".") + "@" + domain;
  return { id: uid("emp"), name, position, department, baseSalary, status, email, joinDate: "2024-09-01" };
}

function student(name: string, className: string, monthlyFee: number, guardian: string, phone: string, cycle: Cycle = "primaire"): Student {
  return {
    id: uid("stu"), name, className, cycle, monthlyFee, guardianName: guardian, guardianPhone: phone,
    status: "active", joinDate: "2026-09-01", note: "",
  };
}

const MONTHS: Record<string, string> = {
  January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
  July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
};
function periodToDate(period: string, day = 5): string {
  const [monthName, year] = period.split(" ");
  return `${year}-${MONTHS[monthName] || "01"}-${String(day).padStart(2, "0")}`;
}

/** Records one payment transaction — this is the ledger, so every call adds a row, never overwrites. */
function pay(payments: Payment[], studentId: string, period: string, amount: number, opts: { day?: number; method?: PaymentMethod } = {}) {
  payments.push({
    id: uid("pay"), studentId, period, amount,
    date: periodToDate(period, opts.day ?? 5),
    method: opts.method ?? "cash",
    recordedAt: Date.now(),
  });
}
/** Full payment in a single transaction. */
function payFull(payments: Payment[], studentId: string, period: string, fee: number, opts: { day?: number; method?: PaymentMethod } = {}) {
  pay(payments, studentId, period, fee, opts);
}
/** A single partial payment (the student still owes the rest — no fabricated "status" is stored, it's derived later). */
function payPartial(payments: Payment[], studentId: string, period: string, paid: number, opts: { day?: number; method?: PaymentMethod } = {}) {
  pay(payments, studentId, period, paid, opts);
}
/** Two separate installments landing in the SAME period — demonstrates the ledger accumulating rather than overwriting. */
function payInstallments(payments: Payment[], studentId: string, period: string, amounts: number[], opts: { method?: PaymentMethod } = {}) {
  amounts.forEach((amt, i) => pay(payments, studentId, period, amt, { day: 4 + i * 12, method: opts.method }));
}
/** No payment recorded for this period — left as a no-op call site for readability in the seed data below. */
function payNone(_payments: Payment[], _studentId: string, _period: string) {
  // intentionally does nothing — an empty ledger for this period reads as "unpaid"
}
/** Marks a period as a social case: the amount due is overridden (often to 0) and flagged for the promoter's visibility. */
function markSocialCase(adjustments: FeeAdjustment[], studentId: string, period: string, amountDue = 0) {
  adjustments.push({ id: uid("adj"), studentId, period, amountDue, reason: "social_case", createdAt: Date.now() });
}

function expense(category: ExpenseCategory, label: string, amount: number, period: string, date: string): Expense {
  return { id: uid("exp"), category, label, amount, period, date, createdAt: Date.now() };
}

function po(
  schoolId: string, schoolName: string, category: ExpenseCategory, label: string, amountRequested: number, period: string,
  status: PurchaseOrderStatus, opts: { date?: string; executedAmount?: number; note?: string } = {}
): PurchaseOrder {
  const requestedAt = Date.now() - 1000 * 60 * 60 * 24 * 3;
  const base: PurchaseOrder = {
    id: uid("po"), schoolId, schoolName, category, label, amountRequested, period,
    note: opts.note, status: "pending", requestedBy: "Administration école", requestedAt,
  };
  if (status === "pending") return base;
  base.status = status;
  base.decidedBy = "Bonté Service";
  base.decidedAt = requestedAt + 1000 * 60 * 60 * 24;
  if (status === "executed") {
    base.executedAmount = opts.executedAmount ?? amountRequested;
    base.executedAt = base.decidedAt;
  }
  return base;
}

function invItem(name: string, category: InventoryCategory, unitPrice: number, quantityOnHand: number): InventoryItem {
  return { id: uid("item"), name, category, unitPrice, quantityOnHand };
}

function stockIn(itemId: string, itemName: string, quantity: number, unitPrice: number, period: string, date: string): StockMovement {
  return { id: uid("mv"), itemId, itemName, type: "in", quantity, unitPrice, amount: quantity * unitPrice, period, date, recordedAt: Date.now(), recordedBy: "Intendance" };
}

function stockSale(itemId: string, itemName: string, quantity: number, unitPrice: number, period: string, date: string): StockMovement {
  return { id: uid("mv"), itemId, itemName, type: "sale", quantity, unitPrice, amount: quantity * unitPrice, period, date, recordedAt: Date.now(), recordedBy: "Intendance" };
}

function salaryGrid(
  schoolId: string, schoolName: string, period: string,
  entries: { employeeId: string; employeeName: string; baseSalary: number }[],
  status: SalaryGridStatus
): SalaryGridSubmission {
  const submittedAt = Date.now() - 1000 * 60 * 60 * 24 * 2;
  const base: SalaryGridSubmission = {
    id: uid("grid"), schoolId, schoolName, period, entries,
    status: "pending", submittedBy: "Bonté Service", submittedAt,
  };
  if (status !== "pending") {
    base.status = status;
    base.decidedBy = "Super Admin";
    base.decidedAt = submittedAt + 1000 * 60 * 60 * 24;
    if (status === "applied") {
      base.generatedCount = entries.length;
      base.sentCount = entries.length;
    }
  }
  return base;
}

function seedSchools(): School[] {
  // ---------- 1. Groupe Scolaire Les Cèdres ----------
  const cedresEmployees = [
    emp("Marceline Fotso", "Directrice", "Administration", 250000, "cedres.edu"),
    emp("Jean-Paul Ateba", "Enseignant CM2", "Enseignants", 120000, "cedres.edu"),
    emp("Solange Mbarga", "Enseignante CM1", "Enseignants", 115000, "cedres.edu"),
    emp("Étienne Nkolo", "Enseignant CE2", "Enseignants", 110000, "cedres.edu"),
    emp("Brigitte Talla", "Enseignante CE1", "Enseignants", 110000, "cedres.edu"),
    emp("Roger Ondoa", "Enseignant CP", "Enseignants", 105000, "cedres.edu"),
    emp("Vivien Essomba", "Surveillant général", "Administration", 95000, "cedres.edu"),
    emp("Chantal Biya", "Secrétaire", "Administration", 85000, "cedres.edu"),
    emp("Paul Mvondo", "Gardien", "Personnel d'appui", 60000, "cedres.edu"),
  ];
  const cedresStudents = [
    student("Aristide Fouda", "CM2", 25000, "Mme Fouda", "699000001"),
    student("Line Ngo Bikoi", "CM2", 25000, "M. Bikoi", "699000002"),
    student("Cyrille Amougou", "CM1", 25000, "Mme Amougou", "699000003"),
    student("Rebecca Same", "CM1", 25000, "M. Same", "699000004"),
    student("Josué Belinga", "CE2", 22000, "Mme Belinga", "699000005"),
    student("Grace Owona", "CE2", 22000, "M. Owona", "699000006"),
    student("Franck Mbella", "CE1", 22000, "Mme Mbella", "699000007"),
    student("Nadège Essola", "CE1", 22000, "M. Essola", "699000008"),
    student("Yvan Ndzana", "CP", 20000, "Mme Ndzana", "699000009"),
    student("Perle Onana", "CP", 20000, "M. Onana", "699000010"),
    student("Blaise Enow", "CM2", 25000, "Mme Enow", "699000011"),
    student("Odile Kamga", "CM1", 25000, "M. Kamga", "699000012"),
  ];
  const cedresPayments: Payment[] = [];
  const cedresAdjustments: FeeAdjustment[] = [];
  payFull(cedresPayments, cedresStudents[0].id, "July 2026", cedresStudents[0].monthlyFee); payFull(cedresPayments, cedresStudents[0].id, "August 2026", cedresStudents[0].monthlyFee);
  payFull(cedresPayments, cedresStudents[1].id, "July 2026", cedresStudents[1].monthlyFee); payFull(cedresPayments, cedresStudents[1].id, "August 2026", cedresStudents[1].monthlyFee);
  payFull(cedresPayments, cedresStudents[2].id, "July 2026", cedresStudents[2].monthlyFee); payPartial(cedresPayments, cedresStudents[2].id, "August 2026", 15000);
  payFull(cedresPayments, cedresStudents[3].id, "July 2026", cedresStudents[3].monthlyFee); payFull(cedresPayments, cedresStudents[3].id, "August 2026", cedresStudents[3].monthlyFee);
  payPartial(cedresPayments, cedresStudents[4].id, "July 2026", 12000); payFull(cedresPayments, cedresStudents[4].id, "August 2026", cedresStudents[4].monthlyFee);
  payFull(cedresPayments, cedresStudents[5].id, "July 2026", cedresStudents[5].monthlyFee); payNone(cedresPayments, cedresStudents[5].id, "August 2026");
  payFull(cedresPayments, cedresStudents[6].id, "July 2026", cedresStudents[6].monthlyFee); payFull(cedresPayments, cedresStudents[6].id, "August 2026", cedresStudents[6].monthlyFee);
  markSocialCase(cedresAdjustments, cedresStudents[7].id, "July 2026"); markSocialCase(cedresAdjustments, cedresStudents[7].id, "August 2026");
  payFull(cedresPayments, cedresStudents[8].id, "July 2026", cedresStudents[8].monthlyFee); payFull(cedresPayments, cedresStudents[8].id, "August 2026", cedresStudents[8].monthlyFee);
  // Two separate installments landing in the same period — the ledger accumulates them (6000 + 4000 = 10000 of 20000 due), it does not overwrite.
  payNone(cedresPayments, cedresStudents[9].id, "July 2026"); payInstallments(cedresPayments, cedresStudents[9].id, "August 2026", [6000, 4000]);
  payFull(cedresPayments, cedresStudents[10].id, "July 2026", cedresStudents[10].monthlyFee); payFull(cedresPayments, cedresStudents[10].id, "August 2026", cedresStudents[10].monthlyFee);
  payFull(cedresPayments, cedresStudents[11].id, "July 2026", cedresStudents[11].monthlyFee); payFull(cedresPayments, cedresStudents[11].id, "August 2026", cedresStudents[11].monthlyFee);

  const cedresFields = defaultFields();
  const cedresPayslips = cedresEmployees.filter((e) => e.status !== "Inactive").map((e, i) => {
    const calc = computePayslip(e, cedresFields);
    return { id: uid("ps"), employeeId: e.id, period: "July 2026", status: (i % 3 === 0 ? "draft" : "sent") as "draft" | "sent", generatedAt: Date.now(), ...calc };
  });

  const cedresInventory = [
    invItem("Uniforme complet primaire", "uniform", 12000, 34),
    invItem("Paire de chaussures", "shoes", 9000, 18),
    invItem("Pull scolaire", "sweater", 7000, 26),
  ];

  const cedresId = uid("sch");
  const cedres: School = {
    id: cedresId,
    name: "Groupe Scolaire Les Cèdres",
    domain: "cedres.edu",
    description: "Primaire — Yaoundé",
    color: "#1F6E4D",
    departments: [
      { id: uid("dept"), name: "Enseignants", head: "Marceline Fotso", description: "Corps enseignant du primaire" },
      { id: uid("dept"), name: "Administration", head: "Marceline Fotso", description: "Direction et gestion administrative" },
      { id: uid("dept"), name: "Personnel d'appui", head: "Vivien Essomba", description: "Gardiennage et entretien" },
    ],
    employees: cedresEmployees,
    fields: cedresFields,
    payslips: cedresPayslips,
    students: cedresStudents,
    payments: cedresPayments,
    feeAdjustments: cedresAdjustments,
    receiptRequests: [],
    purchaseOrders: [
      po(cedresId, "Groupe Scolaire Les Cèdres", "maintenance", "Réparation toiture bloc CM2", 150000, "August 2026", "pending"),
      po(cedresId, "Groupe Scolaire Les Cèdres", "supplies", "Cahiers et manuels rentrée", 90000, "August 2026", "validated"),
      po(cedresId, "Groupe Scolaire Les Cèdres", "fuel", "Carburant groupe électrogène", 45000, "July 2026", "executed", { executedAmount: 43500 }),
    ],
    inventoryItems: cedresInventory,
    stockMovements: [
      stockIn(cedresInventory[0].id, cedresInventory[0].name, 40, 12000, "July 2026", "2026-07-02"),
      stockSale(cedresInventory[0].id, cedresInventory[0].name, 6, 12000, "July 2026", "2026-07-20"),
      stockIn(cedresInventory[1].id, cedresInventory[1].name, 20, 9000, "July 2026", "2026-07-02"),
      stockSale(cedresInventory[1].id, cedresInventory[1].name, 2, 9000, "August 2026", "2026-08-05"),
    ],
    salaryGridSubmissions: [
      salaryGrid(cedresId, "Groupe Scolaire Les Cèdres", "August 2026", [
        { employeeId: cedresEmployees[1].id, employeeName: cedresEmployees[1].name, baseSalary: 125000 },
        { employeeId: cedresEmployees[2].id, employeeName: cedresEmployees[2].name, baseSalary: 118000 },
        { employeeId: cedresEmployees[3].id, employeeName: cedresEmployees[3].name, baseSalary: 112000 },
      ], "pending"),
    ],
    expenses: [
      expense("fuel", "Carburant groupe électrogène", 45000, "July 2026", "2026-07-05"),
      expense("maintenance", "Réparation plomberie", 30000, "July 2026", "2026-07-12"),
      expense("supplies", "Craies, cahiers de classe", 22000, "July 2026", "2026-07-18"),
      expense("credit", "Remboursement crédit bâtiment", 80000, "August 2026", "2026-08-03"),
      expense("renovation", "Peinture salle CE1", 65000, "August 2026", "2026-08-14"),
    ],
  };

  // ---------- 2. Complexe Scolaire La Fontaine ----------
  const fontaineEmployees = [
    emp("Hervé Djoumessi", "Directeur", "Administration", 240000, "fontaine.edu"),
    emp("Adèle Ngassa", "Enseignante 6ème", "Enseignants", 130000, "fontaine.edu"),
    emp("Bertrand Nana", "Enseignant 5ème", "Enseignants", 128000, "fontaine.edu"),
    emp("Clarisse Wandji", "Enseignante 4ème", "Enseignants", 125000, "fontaine.edu"),
    emp("Désiré Fokou", "Enseignant 3ème", "Enseignants", 125000, "fontaine.edu"),
    emp("Amina Sali", "Censeur", "Administration", 110000, "fontaine.edu"),
    emp("Rodrigue Tchinda", "Comptable", "Administration", 100000, "fontaine.edu"),
    emp("Josiane Nkeng", "Agent d'entretien", "Personnel d'appui", 55000, "fontaine.edu"),
  ];
  const fontaineStudents = [
    student("Kevin Fotso Jr", "6ème", 30000, "Mme Fotso", "677000001", "orientation"),
    student("Sandra Meka", "6ème", 30000, "M. Meka", "677000002", "orientation"),
    student("Willy Ebogo", "5ème", 30000, "Mme Ebogo", "677000003", "orientation"),
    student("Carine Nyanga", "5ème", 30000, "M. Nyanga", "677000004", "orientation"),
    student("Steve Abanda", "4ème", 32000, "Mme Abanda", "677000005", "orientation"),
    student("Flore Manga", "4ème", 32000, "M. Manga", "677000006", "orientation"),
    student("Landry Njoya", "3ème", 32000, "Mme Njoya", "677000007", "orientation"),
    student("Aurelie Bikele", "3ème", 32000, "M. Bikele", "677000008", "orientation"),
    student("Patrick Zang", "6ème", 30000, "Mme Zang", "677000009", "orientation"),
    student("Diane Oyono", "5ème", 30000, "M. Oyono", "677000010", "orientation"),
  ];
  const fontainePayments: Payment[] = [];
  const fontaineAdjustments: FeeAdjustment[] = [];
  payFull(fontainePayments, fontaineStudents[0].id, "July 2026", fontaineStudents[0].monthlyFee); payFull(fontainePayments, fontaineStudents[0].id, "August 2026", fontaineStudents[0].monthlyFee);
  payFull(fontainePayments, fontaineStudents[1].id, "July 2026", fontaineStudents[1].monthlyFee); payNone(fontainePayments, fontaineStudents[1].id, "August 2026");
  // Three separate installments across the period, all landing on the ledger — a running balance, not a single overwritten number.
  payInstallments(fontainePayments, fontaineStudents[2].id, "July 2026", [10000, 5000]); payPartial(fontainePayments, fontaineStudents[2].id, "August 2026", 15000);
  payFull(fontainePayments, fontaineStudents[3].id, "July 2026", fontaineStudents[3].monthlyFee); payFull(fontainePayments, fontaineStudents[3].id, "August 2026", fontaineStudents[3].monthlyFee);
  payNone(fontainePayments, fontaineStudents[4].id, "July 2026"); payNone(fontainePayments, fontaineStudents[4].id, "August 2026");
  payFull(fontainePayments, fontaineStudents[5].id, "July 2026", fontaineStudents[5].monthlyFee); payFull(fontainePayments, fontaineStudents[5].id, "August 2026", fontaineStudents[5].monthlyFee);
  markSocialCase(fontaineAdjustments, fontaineStudents[6].id, "July 2026"); markSocialCase(fontaineAdjustments, fontaineStudents[6].id, "August 2026");
  payFull(fontainePayments, fontaineStudents[7].id, "July 2026", fontaineStudents[7].monthlyFee); payPartial(fontainePayments, fontaineStudents[7].id, "August 2026", 20000);
  payFull(fontainePayments, fontaineStudents[8].id, "July 2026", fontaineStudents[8].monthlyFee); payFull(fontainePayments, fontaineStudents[8].id, "August 2026", fontaineStudents[8].monthlyFee);
  payFull(fontainePayments, fontaineStudents[9].id, "July 2026", fontaineStudents[9].monthlyFee); payFull(fontainePayments, fontaineStudents[9].id, "August 2026", fontaineStudents[9].monthlyFee);

  const fontaineFields = defaultFields();
  const fontaineTeacherForPortal = fontaineEmployees[1];
  const fontainePayslips = fontaineEmployees.filter((e) => e.status !== "Inactive").map((e, i) => {
    const calc = computePayslip(e, fontaineFields);
    return { id: uid("ps"), employeeId: e.id, period: "July 2026", status: (i % 4 === 0 ? "draft" : "sent") as "draft" | "sent", generatedAt: Date.now(), ...calc };
  });

  const fontaine: School = {
    id: uid("sch"),
    name: "Complexe Scolaire La Fontaine",
    domain: "fontaine.edu",
    description: "Secondaire — Douala",
    color: "#C99A3B",
    departments: [
      { id: uid("dept"), name: "Enseignants", head: "Adèle Ngassa", description: "Corps enseignant du secondaire" },
      { id: uid("dept"), name: "Administration", head: "Hervé Djoumessi", description: "Direction, censorat et comptabilité" },
      { id: uid("dept"), name: "Personnel d'appui", head: "Josiane Nkeng", description: "Entretien et logistique" },
    ],
    employees: fontaineEmployees,
    fields: fontaineFields,
    payslips: fontainePayslips,
    students: fontaineStudents,
    payments: fontainePayments,
    feeAdjustments: fontaineAdjustments,
    receiptRequests: [],
    purchaseOrders: [],
    inventoryItems: [],
    stockMovements: [],
    salaryGridSubmissions: [],
    expenses: [
      expense("fuel", "Carburant véhicule scolaire", 60000, "July 2026", "2026-07-08"),
      expense("utilities", "Facture électricité", 48000, "July 2026", "2026-07-20"),
      expense("credit", "Échéance crédit mobilier", 95000, "August 2026", "2026-08-02"),
      expense("other", "Fournitures administratives", 18000, "August 2026", "2026-08-11"),
    ],
  };

  // ---------- 3. Institut Bilingue Excellence ----------
  const excellenceEmployees = [
    emp("Rose Ateba", "Directrice", "Administration", 230000, "excellence.edu"),
    emp("Mark Johnson", "English Teacher", "Enseignants", 135000, "excellence.edu"),
    emp("Sylvie Nguema", "Enseignante Français", "Enseignants", 125000, "excellence.edu"),
    emp("David Etoundi", "Enseignant Mathématiques", "Enseignants", 128000, "excellence.edu"),
    emp("Pauline Assiga", "Enseignante Sciences", "Enseignants", 122000, "excellence.edu"),
    emp("Bruno Kenfack", "Économe", "Administration", 105000, "excellence.edu"),
    emp("Alice Menye", "Bibliothécaire", "Personnel d'appui", 70000, "excellence.edu"),
    emp("Guy Larue", "Chauffeur", "Personnel d'appui", 65000, "excellence.edu"),
  ];
  const excellenceStudents = [
    student("Ryan Foka", "5ème Bilingue", 40000, "Mme Foka", "655000001", "orientation"),
    student("Tania Ekwalla", "5ème Bilingue", 40000, "M. Ekwalla", "655000002", "orientation"),
    student("Chris Etame", "4ème Bilingue", 40000, "Mme Etame", "655000003", "orientation"),
    student("Melissa Njoh", "4ème Bilingue", 40000, "M. Njoh", "655000004", "orientation"),
    student("Boris Fongang", "3ème Bilingue", 42000, "Mme Fongang", "655000005", "orientation"),
    student("Nina Ateba", "3ème Bilingue", 42000, "M. Ateba", "655000006", "orientation"),
    student("Éric Talom", "6ème Bilingue", 38000, "Mme Talom", "655000007", "orientation"),
    student("Sarah Mbia", "6ème Bilingue", 38000, "M. Mbia", "655000008", "orientation"),
    student("Junior Awono", "5ème Bilingue", 40000, "Mme Awono", "655000009", "orientation"),
    student("Priscille Doumbe", "4ème Bilingue", 40000, "M. Doumbe", "655000010", "orientation"),
    student("Alex Ngo", "3ème Bilingue", 42000, "Mme Ngo", "655000011", "orientation"),
    student("Vanessa Kotto", "6ème Bilingue", 38000, "M. Kotto", "655000012", "orientation"),
    student("Cedric Ossome", "5ème Bilingue", 40000, "Mme Ossome", "655000013", "orientation"),
  ];
  const excellencePayments: Payment[] = [];
  const excellenceAdjustments: FeeAdjustment[] = [];
  payFull(excellencePayments, excellenceStudents[0].id, "August 2026", excellenceStudents[0].monthlyFee);
  payFull(excellencePayments, excellenceStudents[1].id, "August 2026", excellenceStudents[1].monthlyFee);
  payPartial(excellencePayments, excellenceStudents[2].id, "August 2026", 20000);
  payFull(excellencePayments, excellenceStudents[3].id, "August 2026", excellenceStudents[3].monthlyFee);
  payFull(excellencePayments, excellenceStudents[4].id, "August 2026", excellenceStudents[4].monthlyFee);
  payNone(excellencePayments, excellenceStudents[5].id, "August 2026");
  payFull(excellencePayments, excellenceStudents[6].id, "August 2026", excellenceStudents[6].monthlyFee);
  payFull(excellencePayments, excellenceStudents[7].id, "August 2026", excellenceStudents[7].monthlyFee);
  markSocialCase(excellenceAdjustments, excellenceStudents[8].id, "August 2026");
  payFull(excellencePayments, excellenceStudents[9].id, "August 2026", excellenceStudents[9].monthlyFee);
  payPartial(excellencePayments, excellenceStudents[10].id, "August 2026", 25000);
  payFull(excellencePayments, excellenceStudents[11].id, "August 2026", excellenceStudents[11].monthlyFee);
  payNone(excellencePayments, excellenceStudents[12].id, "August 2026");

  const excellence: School = {
    id: uid("sch"),
    name: "Institut Bilingue Excellence",
    domain: "excellence.edu",
    description: "Bilingue — Bafoussam",
    color: "#6B8F71",
    departments: [
      { id: uid("dept"), name: "Enseignants", head: "Sylvie Nguema", description: "Corps enseignant bilingue" },
      { id: uid("dept"), name: "Administration", head: "Rose Ateba", description: "Direction et économat" },
      { id: uid("dept"), name: "Personnel d'appui", head: "Alice Menye", description: "Bibliothèque et transport" },
    ],
    employees: excellenceEmployees,
    fields: defaultFields(),
    payslips: [],
    students: excellenceStudents,
    payments: excellencePayments,
    feeAdjustments: excellenceAdjustments,
    receiptRequests: [],
    purchaseOrders: [],
    inventoryItems: [],
    stockMovements: [],
    salaryGridSubmissions: [],
    expenses: [
      expense("supplies", "Manuels bilingues", 90000, "August 2026", "2026-08-01"),
      expense("fuel", "Carburant bus scolaire", 55000, "August 2026", "2026-08-09"),
      expense("maintenance", "Entretien climatisation", 28000, "August 2026", "2026-08-19"),
    ],
  };

  // ---------- 4. École Nouvelle Horizon ----------
  const horizonEmployees = [
    emp("Théophile Mbassi", "Directeur", "Administration", 200000, "horizon.edu"),
    emp("Larissa Ekani", "Enseignante Maternelle", "Enseignants", 95000, "horizon.edu"),
    emp("Yannick Bella", "Enseignant CP", "Enseignants", 100000, "horizon.edu"),
    emp("Odette Fouda", "Enseignante CE1", "Enseignants", 100000, "horizon.edu"),
    emp("Simon Abega", "Surveillant", "Administration", 75000, "horizon.edu"),
    emp("Delphine Ntolo", "Gardienne", "Personnel d'appui", 55000, "horizon.edu"),
  ];
  const horizonStudents = [
    student("Emma Nkodo", "Maternelle", 18000, "Mme Nkodo", "690000001"),
    student("Noah Biloa", "Maternelle", 18000, "M. Biloa", "690000002"),
    student("Chloé Essiane", "CP", 19000, "Mme Essiane", "690000003"),
    student("Liam Owoundi", "CP", 19000, "M. Owoundi", "690000004"),
    student("Léa Mengue", "CE1", 20000, "Mme Mengue", "690000005"),
    student("Nathan Bikoro", "CE1", 20000, "M. Bikoro", "690000006"),
    student("Inès Ekomo", "Maternelle", 18000, "Mme Ekomo", "690000007"),
    student("Théo Ndongo", "CP", 19000, "M. Ndongo", "690000008"),
  ];
  const horizonPayments: Payment[] = [];
  const horizonAdjustments: FeeAdjustment[] = [];
  payFull(horizonPayments, horizonStudents[0].id, "August 2026", horizonStudents[0].monthlyFee);
  payFull(horizonPayments, horizonStudents[1].id, "August 2026", horizonStudents[1].monthlyFee);
  payPartial(horizonPayments, horizonStudents[2].id, "August 2026", 10000);
  payFull(horizonPayments, horizonStudents[3].id, "August 2026", horizonStudents[3].monthlyFee);
  payNone(horizonPayments, horizonStudents[4].id, "August 2026");
  markSocialCase(horizonAdjustments, horizonStudents[5].id, "August 2026");
  payFull(horizonPayments, horizonStudents[6].id, "August 2026", horizonStudents[6].monthlyFee);
  payFull(horizonPayments, horizonStudents[7].id, "August 2026", horizonStudents[7].monthlyFee);

  const horizon: School = {
    id: uid("sch"),
    name: "École Nouvelle Horizon",
    domain: "horizon.edu",
    description: "Maternelle & Primaire — Bertoua",
    color: "#5B7FA6",
    departments: [
      { id: uid("dept"), name: "Enseignants", head: "Larissa Ekani", description: "Corps enseignant" },
      { id: uid("dept"), name: "Administration", head: "Théophile Mbassi", description: "Direction et surveillance" },
      { id: uid("dept"), name: "Personnel d'appui", head: "Delphine Ntolo", description: "Gardiennage" },
    ],
    employees: horizonEmployees,
    fields: defaultFields(),
    payslips: [],
    students: horizonStudents,
    payments: horizonPayments,
    feeAdjustments: horizonAdjustments,
    receiptRequests: [],
    purchaseOrders: [],
    inventoryItems: [],
    stockMovements: [],
    salaryGridSubmissions: [],
    expenses: [
      expense("renovation", "Réfection cour de récréation", 50000, "August 2026", "2026-08-06"),
      expense("supplies", "Matériel pédagogique maternelle", 24000, "August 2026", "2026-08-15"),
    ],
  };

  // ---------- 5. Académie Saint-Michel (new this year) ----------
  const michelEmployees = [
    emp("Anicet Owona", "Directeur", "Administration", 190000, "saintmichel.edu"),
    emp("Judith Ebode", "Enseignante CI", "Enseignants", 90000, "saintmichel.edu"),
    emp("François Ella", "Enseignant CP", "Enseignants", 90000, "saintmichel.edu"),
    emp("Régine Assam", "Gardienne", "Personnel d'appui", 50000, "saintmichel.edu"),
  ];
  const michelStudents = [
    student("Divine Ateba", "CI", 17000, "Mme Ateba", "696000001"),
    student("Prince Nnomo", "CI", 17000, "M. Nnomo", "696000002"),
    student("Merveille Onana", "CP", 18000, "Mme Onana", "696000003"),
    student("Israël Mbarga", "CP", 18000, "M. Mbarga", "696000004"),
    student("Gaëlle Fouda", "CI", 17000, "Mme Fouda", "696000005"),
    student("Elvis Ngo", "CP", 18000, "M. Ngo", "696000006"),
  ];
  const michelPayments: Payment[] = [];
  const michelAdjustments: FeeAdjustment[] = [];
  payFull(michelPayments, michelStudents[0].id, "August 2026", michelStudents[0].monthlyFee);
  payNone(michelPayments, michelStudents[1].id, "August 2026");
  payFull(michelPayments, michelStudents[2].id, "August 2026", michelStudents[2].monthlyFee);
  payPartial(michelPayments, michelStudents[3].id, "August 2026", 8000);
  markSocialCase(michelAdjustments, michelStudents[4].id, "August 2026");
  payFull(michelPayments, michelStudents[5].id, "August 2026", michelStudents[5].monthlyFee);

  const saintMichel: School = {
    id: uid("sch"),
    name: "Académie Saint-Michel",
    domain: "saintmichel.edu",
    description: "Primaire — nouvelle école, 1ère rentrée",
    color: "#9C6B8E",
    departments: [
      { id: uid("dept"), name: "Enseignants", head: "Judith Ebode", description: "Corps enseignant" },
      { id: uid("dept"), name: "Administration", head: "Anicet Owona", description: "Direction" },
      { id: uid("dept"), name: "Personnel d'appui", head: "Régine Assam", description: "Gardiennage" },
    ],
    employees: michelEmployees,
    fields: defaultFields(),
    payslips: [],
    students: michelStudents,
    payments: michelPayments,
    feeAdjustments: michelAdjustments,
    receiptRequests: [],
    purchaseOrders: [],
    inventoryItems: [],
    stockMovements: [],
    salaryGridSubmissions: [],
    expenses: [
      expense("renovation", "Aménagement des salles de classe", 120000, "July 2026", "2026-07-02"),
      expense("supplies", "Tables-bancs et fournitures", 85000, "July 2026", "2026-07-10"),
    ],
  };

  return [cedres, fontaine, excellence, horizon, saintMichel];
}

async function seedUsers(schools: School[]) {
  const [cedres, fontaine, excellence, horizon, saintMichel] = schools;
  const pw = (p: string) => bcrypt.hashSync(p, 8);
  const fontaineTeacher = fontaine.employees[1]; // Adèle Ngassa

  const users: AppUser[] = [
    {
      id: uid("user"), name: "Admin Ledger", email: "admin@ledger.io",
      passwordHash: pw("admin1234"), role: "super_admin", status: "active",
    },
    {
      id: uid("user"), name: "Le Promoteur", email: "promoteur@groupescolaire.cm",
      passwordHash: pw("promoteur1234"), role: "promoter", status: "active",
    },
    {
      id: uid("user"), name: "Bonté Service", email: "tresorerie@bonteservice.cm",
      passwordHash: pw("tresorerie1234"), role: "treasury", status: "active",
    },
    {
      id: uid("user"), name: "Marceline Fotso", email: "admin.cedres@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", status: "active", schoolId: cedres.id,
    },
    {
      id: uid("user"), name: "Rodrigue Tchinda", email: "finance.cedres@groupescolaire.cm",
      passwordHash: pw("finance1234"), role: "finance", status: "active", schoolId: cedres.id,
    },
    {
      // Caisse — the only account that enrolls students and updates fee
      // status on collection; separated from school_admin by design.
      id: uid("user"), name: "Caissière Cèdres", email: "caisse.cedres@groupescolaire.cm",
      passwordHash: pw("caisse1234"), role: "cashier", status: "active", schoolId: cedres.id,
    },
    {
      id: uid("user"), name: "Intendant Cèdres", email: "intendance.cedres@groupescolaire.cm",
      passwordHash: pw("intendance1234"), role: "logistics", status: "active", schoolId: cedres.id,
    },
    {
      id: uid("user"), name: "Hervé Djoumessi", email: "admin.fontaine@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", status: "active", schoolId: fontaine.id,
    },
    {
      id: uid("user"), name: fontaineTeacher.name, email: "enseignant.fontaine@groupescolaire.cm",
      passwordHash: pw("enseignant1234"), role: "teacher", status: "active", schoolId: fontaine.id, employeeId: fontaineTeacher.id,
    },
    {
      id: uid("user"), name: "Rose Ateba", email: "admin.excellence@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", status: "active", schoolId: excellence.id,
    },
    {
      id: uid("user"), name: "Théophile Mbassi", email: "admin.horizon@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", status: "active", schoolId: horizon.id,
    },
    {
      id: uid("user"), name: "Anicet Owona", email: "admin.saintmichel@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", status: "active", schoolId: saintMichel.id,
    },
  ];

  const db = await getDb();
  await db.collection("users").insertMany(users);
}

/**
 * Demo/seed accounts added after an install's first boot (like the
 * cashier role) never get created by seedUsers() above — that block only
 * runs once, when the users collection is completely empty. This backfills
 * any such accounts by email, one at a time, so an existing database
 * self-heals on the next server start instead of requiring a manual reseed.
 */
async function backfillDemoAccounts() {
  const db = await getDb();
  const pw = (p: string) => bcrypt.hashSync(p, 8);
  const users = db.collection<AppUser>("users");

  const cashierEmail = "caisse.cedres@groupescolaire.cm";
  const hasCashier = await users.findOne({ email: cashierEmail });
  if (!hasCashier) {
    // Piggyback on the Cèdres school admin account, which is guaranteed to
    // already exist, to find the right schoolId without re-deriving it.
    const schoolAdmin = await users.findOne({ email: "admin.cedres@groupescolaire.cm" });
    if (schoolAdmin?.schoolId) {
      await users.insertOne({
        id: uid("user"), name: "Caissière Cèdres", email: cashierEmail,
        passwordHash: pw("caisse1234"), role: "cashier", status: "active", schoolId: schoolAdmin.schoolId,
      });
    }
  }
}

/**
 * Ensures the database has the full seed set (users across every role +
 * the 5 schools) on first run. Cheap no-op on every call after the first
 * (per server process).
 */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const db = await getDb();

  const schoolCount = await db.collection("schools").countDocuments();
  let schools: School[] = [];
  if (schoolCount === 0) {
    schools = seedSchools();
    await db.collection("schools").insertMany(schools);
  }

  const userCount = await db.collection("users").countDocuments();
  if (userCount === 0) {
    const currentSchools = schools.length ? schools : (await db.collection<School>("schools").find({}).toArray());
    await seedUsers(currentSchools);
  } else {
    await backfillDemoAccounts();
  }

  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("schools").createIndex({ id: 1 }, { unique: true });
  await db.collection("schools").createIndex({ domain: 1 }, { unique: true });

  seeded = true;
}
