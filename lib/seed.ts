import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";
import { uid } from "./uid";
import { computePayslip } from "./calc";
import type {
  School, EmployeeStatus, Fields, Student, FeeStatus, Expense, ExpenseCategory, AppUser, Employee,
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

function student(name: string, className: string, monthlyFee: number, guardian: string, phone: string): Student {
  return {
    id: uid("stu"), name, className, monthlyFee, status: "unpaid",
    guardianName: guardian, guardianPhone: phone, records: [],
  };
}

function feeRecord(period: string, amountDue: number, amountPaid: number, status: FeeStatus) {
  return { id: uid("fee"), period, amountDue, amountPaid, status, recordedAt: Date.now() };
}

function payFull(s: Student, period: string) {
  s.records.push(feeRecord(period, s.monthlyFee, s.monthlyFee, "paid"));
  s.status = "paid";
  return s;
}
function payPartial(s: Student, period: string, paid: number) {
  s.records.push(feeRecord(period, s.monthlyFee, paid, "partial"));
  s.status = "partial";
  return s;
}
function payNone(s: Student, period: string) {
  s.records.push(feeRecord(period, s.monthlyFee, 0, "unpaid"));
  s.status = "unpaid";
  return s;
}
function socialCase(s: Student, period: string) {
  s.records.push(feeRecord(period, s.monthlyFee, 0, "social_case"));
  s.status = "social_case";
  return s;
}

function expense(category: ExpenseCategory, label: string, amount: number, period: string, date: string): Expense {
  return { id: uid("exp"), category, label, amount, period, date, createdAt: Date.now() };
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
  payFull(cedresStudents[0], "July 2026"); payFull(cedresStudents[0], "August 2026");
  payFull(cedresStudents[1], "July 2026"); payFull(cedresStudents[1], "August 2026");
  payFull(cedresStudents[2], "July 2026"); payPartial(cedresStudents[2], "August 2026", 15000);
  payFull(cedresStudents[3], "July 2026"); payFull(cedresStudents[3], "August 2026");
  payPartial(cedresStudents[4], "July 2026", 12000); payFull(cedresStudents[4], "August 2026");
  payFull(cedresStudents[5], "July 2026"); payNone(cedresStudents[5], "August 2026");
  payFull(cedresStudents[6], "July 2026"); payFull(cedresStudents[6], "August 2026");
  socialCase(cedresStudents[7], "July 2026"); socialCase(cedresStudents[7], "August 2026");
  payFull(cedresStudents[8], "July 2026"); payFull(cedresStudents[8], "August 2026");
  payNone(cedresStudents[9], "July 2026"); payPartial(cedresStudents[9], "August 2026", 10000);
  payFull(cedresStudents[10], "July 2026"); payFull(cedresStudents[10], "August 2026");
  payFull(cedresStudents[11], "July 2026"); payFull(cedresStudents[11], "August 2026");

  const cedresFields = defaultFields();
  const cedresPayslips = cedresEmployees.filter((e) => e.status !== "Inactive").map((e, i) => {
    const calc = computePayslip(e, cedresFields);
    return { id: uid("ps"), employeeId: e.id, period: "July 2026", status: (i % 3 === 0 ? "draft" : "sent") as "draft" | "sent", generatedAt: Date.now(), ...calc };
  });

  const cedres: School = {
    id: uid("sch"),
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
    student("Kevin Fotso Jr", "6ème", 30000, "Mme Fotso", "677000001"),
    student("Sandra Meka", "6ème", 30000, "M. Meka", "677000002"),
    student("Willy Ebogo", "5ème", 30000, "Mme Ebogo", "677000003"),
    student("Carine Nyanga", "5ème", 30000, "M. Nyanga", "677000004"),
    student("Steve Abanda", "4ème", 32000, "Mme Abanda", "677000005"),
    student("Flore Manga", "4ème", 32000, "M. Manga", "677000006"),
    student("Landry Njoya", "3ème", 32000, "Mme Njoya", "677000007"),
    student("Aurelie Bikele", "3ème", 32000, "M. Bikele", "677000008"),
    student("Patrick Zang", "6ème", 30000, "Mme Zang", "677000009"),
    student("Diane Oyono", "5ème", 30000, "M. Oyono", "677000010"),
  ];
  payFull(fontaineStudents[0], "July 2026"); payFull(fontaineStudents[0], "August 2026");
  payFull(fontaineStudents[1], "July 2026"); payNone(fontaineStudents[1], "August 2026");
  payPartial(fontaineStudents[2], "July 2026", 15000); payPartial(fontaineStudents[2], "August 2026", 15000);
  payFull(fontaineStudents[3], "July 2026"); payFull(fontaineStudents[3], "August 2026");
  payNone(fontaineStudents[4], "July 2026"); payNone(fontaineStudents[4], "August 2026");
  payFull(fontaineStudents[5], "July 2026"); payFull(fontaineStudents[5], "August 2026");
  socialCase(fontaineStudents[6], "July 2026"); socialCase(fontaineStudents[6], "August 2026");
  payFull(fontaineStudents[7], "July 2026"); payPartial(fontaineStudents[7], "August 2026", 20000);
  payFull(fontaineStudents[8], "July 2026"); payFull(fontaineStudents[8], "August 2026");
  payFull(fontaineStudents[9], "July 2026"); payFull(fontaineStudents[9], "August 2026");

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
    student("Ryan Foka", "5ème Bilingue", 40000, "Mme Foka", "655000001"),
    student("Tania Ekwalla", "5ème Bilingue", 40000, "M. Ekwalla", "655000002"),
    student("Chris Etame", "4ème Bilingue", 40000, "Mme Etame", "655000003"),
    student("Melissa Njoh", "4ème Bilingue", 40000, "M. Njoh", "655000004"),
    student("Boris Fongang", "3ème Bilingue", 42000, "Mme Fongang", "655000005"),
    student("Nina Ateba", "3ème Bilingue", 42000, "M. Ateba", "655000006"),
    student("Éric Talom", "6ème Bilingue", 38000, "Mme Talom", "655000007"),
    student("Sarah Mbia", "6ème Bilingue", 38000, "M. Mbia", "655000008"),
    student("Junior Awono", "5ème Bilingue", 40000, "Mme Awono", "655000009"),
    student("Priscille Doumbe", "4ème Bilingue", 40000, "M. Doumbe", "655000010"),
    student("Alex Ngo", "3ème Bilingue", 42000, "Mme Ngo", "655000011"),
    student("Vanessa Kotto", "6ème Bilingue", 38000, "M. Kotto", "655000012"),
    student("Cedric Ossome", "5ème Bilingue", 40000, "Mme Ossome", "655000013"),
  ];
  payFull(excellenceStudents[0], "August 2026");
  payFull(excellenceStudents[1], "August 2026");
  payPartial(excellenceStudents[2], "August 2026", 20000);
  payFull(excellenceStudents[3], "August 2026");
  payFull(excellenceStudents[4], "August 2026");
  payNone(excellenceStudents[5], "August 2026");
  payFull(excellenceStudents[6], "August 2026");
  payFull(excellenceStudents[7], "August 2026");
  socialCase(excellenceStudents[8], "August 2026");
  payFull(excellenceStudents[9], "August 2026");
  payPartial(excellenceStudents[10], "August 2026", 25000);
  payFull(excellenceStudents[11], "August 2026");
  payNone(excellenceStudents[12], "August 2026");

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
  payFull(horizonStudents[0], "August 2026");
  payFull(horizonStudents[1], "August 2026");
  payPartial(horizonStudents[2], "August 2026", 10000);
  payFull(horizonStudents[3], "August 2026");
  payNone(horizonStudents[4], "August 2026");
  socialCase(horizonStudents[5], "August 2026");
  payFull(horizonStudents[6], "August 2026");
  payFull(horizonStudents[7], "August 2026");

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
  payFull(michelStudents[0], "August 2026");
  payNone(michelStudents[1], "August 2026");
  payFull(michelStudents[2], "August 2026");
  payPartial(michelStudents[3], "August 2026", 8000);
  socialCase(michelStudents[4], "August 2026");
  payFull(michelStudents[5], "August 2026");

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
      passwordHash: pw("admin1234"), role: "super_admin",
    },
    {
      id: uid("user"), name: "Le Promoteur", email: "promoteur@groupescolaire.cm",
      passwordHash: pw("promoteur1234"), role: "promoter",
    },
    {
      id: uid("user"), name: "Marceline Fotso", email: "admin.cedres@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", schoolId: cedres.id,
    },
    {
      id: uid("user"), name: "Rodrigue Tchinda", email: "finance.cedres@groupescolaire.cm",
      passwordHash: pw("finance1234"), role: "finance", schoolId: cedres.id,
    },
    {
      id: uid("user"), name: "Hervé Djoumessi", email: "admin.fontaine@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", schoolId: fontaine.id,
    },
    {
      id: uid("user"), name: fontaineTeacher.name, email: "enseignant.fontaine@groupescolaire.cm",
      passwordHash: pw("enseignant1234"), role: "teacher", schoolId: fontaine.id, employeeId: fontaineTeacher.id,
    },
    {
      id: uid("user"), name: "Rose Ateba", email: "admin.excellence@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", schoolId: excellence.id,
    },
    {
      id: uid("user"), name: "Théophile Mbassi", email: "admin.horizon@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", schoolId: horizon.id,
    },
    {
      id: uid("user"), name: "Anicet Owona", email: "admin.saintmichel@groupescolaire.cm",
      passwordHash: pw("ecole1234"), role: "school_admin", schoolId: saintMichel.id,
    },
  ];

  const db = await getDb();
  await db.collection("users").insertMany(users);
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
  }

  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("schools").createIndex({ id: 1 }, { unique: true });
  await db.collection("schools").createIndex({ domain: 1 }, { unique: true });

  seeded = true;
}
