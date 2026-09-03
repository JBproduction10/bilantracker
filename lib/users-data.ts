import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "./mongodb";
import { ensureSeeded } from "./seed";
import { uid } from "./uid";
import { sendInviteEmail, sendPasswordResetEmail } from "./mailer";
import { ROLE_LABELS } from "./constants";
import { assertValidEmail } from "./validation";
import type { AppUser, Role, UserInput, SetPasswordInput, ResetPasswordInput } from "./types";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour — shorter than an invite, since the account is already active

async function collection() {
  await ensureSeeded();
  const db = await getDb();
  return db.collection<AppUser>("users");
}

function strip(doc: (AppUser & { _id?: unknown }) | null): Omit<AppUser, "passwordHash" | "inviteToken" | "resetToken"> | null {
  if (!doc) return null;
  const { _id, passwordHash, inviteToken, resetToken, ...rest } = doc;
  return rest;
}

function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function listUsers() {
  const col = await collection();
  const docs = await col.find({}).sort({ role: 1, name: 1 }).toArray();
  return docs.map((d) => strip(d)!);
}

/**
 * Ids of every active account matching the given role(s), optionally
 * narrowed to one school — used to fan out notifications (e.g. every
 * school admin at a given school, or every treasury/super admin
 * network-wide) without loading full user records.
 */
export async function listUserIdsByRole(roles: Role[], schoolId?: string): Promise<string[]> {
  const col = await collection();
  const filter: Record<string, unknown> = { role: { $in: roles }, status: "active" };
  if (schoolId) filter.schoolId = schoolId;
  const docs = await col.find(filter, { projection: { id: 1 } }).toArray();
  return docs.map((d) => d.id);
}

/**
 * Only a super admin ever calls this. It does not set a password — it
 * creates a pending account and emails the person a link to choose their
 * own password. There is no public sign-up; this invite is the only way
 * a new account comes into existence.
 */
export async function createUser({ name, email, role, schoolId, employeeId }: UserInput, schoolName?: string) {
  if (!name || !email || !role) throw new Error("Fill in the name, email, and role.");
  const cleanEmail = assertValidEmail(email, "L'email du compte");
  const col = await collection();
  const clash = await col.findOne({ email: cleanEmail });
  if (clash) throw new Error("Someone already has an account with that email.");
  if ((role === "school_admin" || role === "finance" || role === "teacher" || role === "logistics") && !schoolId) {
    throw new Error("Choose which school this account belongs to.");
  }

  const inviteToken = newToken();
  const user: AppUser = {
    id: uid("user"), name: name.trim(), email: cleanEmail, role,
    status: "pending",
    inviteToken, inviteTokenExpires: Date.now() + INVITE_TTL_MS,
    ...(schoolId ? { schoolId } : {}),
    ...(employeeId ? { employeeId } : {}),
  };
  await col.insertOne(user);

  const result = await sendInviteEmail({ to: cleanEmail, name: user.name, roleLabel: ROLE_LABELS[role], schoolName, token: inviteToken, schoolId });
  return { user: strip(user)!, invite: result };
}

/** Generates a fresh invite link and re-sends it — for accounts that missed or lost the original email. */
export async function resendInvite(id: string, schoolName?: string) {
  const col = await collection();
  const user = await col.findOne({ id });
  if (!user) throw new Error("Account not found.");
  if (user.status === "active") throw new Error("This account already has a password set.");

  const inviteToken = newToken();
  await col.updateOne({ id }, { $set: { inviteToken, inviteTokenExpires: Date.now() + INVITE_TTL_MS } });

  const result = await sendInviteEmail({ to: user.email, name: user.name, roleLabel: ROLE_LABELS[user.role], schoolName, token: inviteToken, schoolId: user.schoolId });
  return result;
}

/** Looks up a pending invite by token, without exposing anything sensitive — used to greet the person on the set-password page. */
export async function checkInviteToken(token: string) {
  const col = await collection();
  const user = await col.findOne({ inviteToken: token });
  if (!user) return { valid: false as const, reason: "Ce lien n'est pas valide." };
  if (user.status === "active") return { valid: false as const, reason: "Ce compte a déjà un mot de passe." };
  if (!user.inviteTokenExpires || user.inviteTokenExpires < Date.now()) {
    return { valid: false as const, reason: "Ce lien a expiré. Demandez à votre administrateur de le renvoyer." };
  }
  return { valid: true as const, name: user.name, email: user.email };
}

/** The only way a pending account becomes able to log in: the person themself sets their password via a valid invite token. */
export async function setPasswordWithToken({ token, password }: SetPasswordInput): Promise<void> {
  if (!password || password.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  const col = await collection();
  const user = await col.findOne({ inviteToken: token });
  if (!user) throw new Error("Ce lien n'est pas valide.");
  if (user.status === "active") throw new Error("Ce compte a déjà un mot de passe.");
  if (!user.inviteTokenExpires || user.inviteTokenExpires < Date.now()) {
    throw new Error("Ce lien a expiré. Demandez à votre administrateur de le renvoyer.");
  }
  await col.updateOne(
    { id: user.id },
    {
      $set: { passwordHash: bcrypt.hashSync(password, 8), status: "active" },
      $unset: { inviteToken: "", inviteTokenExpires: "" },
    }
  );
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

/**
 * The single "forgot password" entry point on the login page. Deliberately
 * silent about whether the email exists at all, to avoid leaking who has an
 * account — the API route always reports success regardless of what
 * actually happened here.
 *
 * If the account is still pending (never activated), this resends the
 * original invite instead of a reset link — from the person's point of
 * view "I lost my password" and "I lost my invite" are the same problem.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const col = await collection();
  const user = await col.findOne({ email: email.trim().toLowerCase() });
  if (!user) return; // silently ignore — don't reveal whether the account exists

  if (user.status === "pending") {
    const inviteToken = newToken();
    await col.updateOne({ id: user.id }, { $set: { inviteToken, inviteTokenExpires: Date.now() + INVITE_TTL_MS } });
    await sendInviteEmail({ to: user.email, name: user.name, roleLabel: ROLE_LABELS[user.role], token: inviteToken, schoolId: user.schoolId });
    return;
  }

  const resetToken = newToken();
  await col.updateOne({ id: user.id }, { $set: { resetToken, resetTokenExpires: Date.now() + RESET_TTL_MS } });
  await sendPasswordResetEmail({ to: user.email, name: user.name, token: resetToken, schoolId: user.schoolId });
}

/** Looks up a password-reset token, without exposing anything sensitive — used to greet the person on the reset-password page. */
export async function checkResetToken(token: string) {
  const col = await collection();
  const user = await col.findOne({ resetToken: token });
  if (!user) return { valid: false as const, reason: "Ce lien n'est pas valide." };
  if (!user.resetTokenExpires || user.resetTokenExpires < Date.now()) {
    return { valid: false as const, reason: "Ce lien a expiré. Demandez un nouveau lien depuis la page de connexion." };
  }
  return { valid: true as const, name: user.name, email: user.email };
}

/** The person sets a new password via a valid, unexpired reset token — the only way to regain access to an active account. */
export async function resetPasswordWithToken({ token, password }: ResetPasswordInput): Promise<void> {
  if (!password || password.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  const col = await collection();
  const user = await col.findOne({ resetToken: token });
  if (!user) throw new Error("Ce lien n'est pas valide.");
  if (!user.resetTokenExpires || user.resetTokenExpires < Date.now()) {
    throw new Error("Ce lien a expiré. Demandez un nouveau lien depuis la page de connexion.");
  }
  await col.updateOne(
    { id: user.id },
    {
      $set: { passwordHash: bcrypt.hashSync(password, 8), status: "active" },
      $unset: { resetToken: "", resetTokenExpires: "" },
    }
  );
}
