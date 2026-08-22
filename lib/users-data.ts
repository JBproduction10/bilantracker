import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";
import { ensureSeeded } from "./seed";
import { uid } from "./uid";
import type { AppUser, UserInput } from "./types";

async function collection() {
  await ensureSeeded();
  const db = await getDb();
  return db.collection<AppUser>("users");
}

function strip(doc: (AppUser & { _id?: unknown }) | null): Omit<AppUser, "passwordHash"> | null {
  if (!doc) return null;
  const { _id, passwordHash, ...rest } = doc;
  return rest;
}

export async function listUsers() {
  const col = await collection();
  const docs = await col.find({}).sort({ role: 1, name: 1 }).toArray();
  return docs.map((d) => strip(d)!);
}

export async function createUser({ name, email, password, role, schoolId, employeeId }: UserInput) {
  if (!name || !email || !password || !role) throw new Error("Fill in name, email, password, and role.");
  if (password.length < 6) throw new Error("Password needs to be at least 6 characters.");
  const col = await collection();
  const cleanEmail = email.trim().toLowerCase();
  const clash = await col.findOne({ email: cleanEmail });
  if (clash) throw new Error("Someone already has an account with that email.");
  if ((role === "school_admin" || role === "finance" || role === "teacher") && !schoolId) {
    throw new Error("Choose which school this account belongs to.");
  }
  const user: AppUser = {
    id: uid("user"), name: name.trim(), email: cleanEmail,
    passwordHash: bcrypt.hashSync(password, 8), role,
    ...(schoolId ? { schoolId } : {}),
    ...(employeeId ? { employeeId } : {}),
  };
  await col.insertOne(user);
  return strip(user)!;
}

export async function removeUser(id: string): Promise<void> {
  const col = await collection();
  const total = await col.countDocuments({ role: "super_admin" });
  const target = await col.findOne({ id });
  if (target?.role === "super_admin" && total <= 1) {
    throw new Error("You need at least one super admin account.");
  }
  const result = await col.deleteOne({ id });
  if (result.deletedCount === 0) throw new Error("Account not found.");
}
