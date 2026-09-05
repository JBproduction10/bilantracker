import { getDb } from "./mongodb";
import { ensureSeeded } from "./seed";
import { uid } from "./uid";
import type { Promoter, PromoterInput } from "./types";

async function collection() {
  await ensureSeeded();
  const db = await getDb();
  return db.collection<Promoter>("promoters");
}

function strip(doc: (Promoter & { _id?: unknown }) | null): Promoter | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as Promoter;
}

export async function listPromoters(): Promise<Promoter[]> {
  const col = await collection();
  const docs = await col.find({}).sort({ name: 1 }).toArray();
  return docs.map((d) => strip(d) as Promoter);
}

export async function getPromoter(id: string): Promise<Promoter | null> {
  const col = await collection();
  return strip(await col.findOne({ id }));
}

/**
 * Only the super admin ever calls this — a promoter (network owner) is a
 * tenant boundary, not something a promoter or treasury account can create
 * for itself. `hasTreasury` decides whether this network runs a separate
 * treasury company overseeing fund requests/payroll pushes for its schools,
 * or whether each of its schools manages its own finances directly.
 */
export async function createPromoter({ name, hasTreasury, treasuryName }: PromoterInput): Promise<Promoter> {
  if (!name?.trim()) throw new Error("Give this promoter a name.");
  const col = await collection();
  const promoter: Promoter = {
    id: uid("promo"),
    name: name.trim(),
    hasTreasury: Boolean(hasTreasury),
    treasuryName: hasTreasury ? (treasuryName?.trim() || "Bonté Service") : undefined,
    createdAt: Date.now(),
  };
  await col.insertOne(promoter);
  return promoter;
}

export async function updatePromoter(id: string, { name, hasTreasury, treasuryName }: Partial<PromoterInput>): Promise<Promoter> {
  const col = await collection();
  const promoter = await col.findOne({ id });
  if (!promoter) throw new Error("Promoter not found.");
  if (name !== undefined) promoter.name = name.trim();
  if (hasTreasury !== undefined) promoter.hasTreasury = Boolean(hasTreasury);
  if (promoter.hasTreasury) {
    if (treasuryName !== undefined) promoter.treasuryName = treasuryName.trim() || "Bonté Service";
    if (!promoter.treasuryName) promoter.treasuryName = "Bonté Service";
  } else {
    promoter.treasuryName = undefined;
  }
  await col.replaceOne({ id }, promoter);
  return strip(promoter) as Promoter;
}

/**
 * A promoter can only be deleted once it has no schools and no accounts
 * (promoter/treasury) still pointing at it — otherwise those records would
 * silently become orphaned/unscoped, which would leak across tenants.
 */
export async function deletePromoter(id: string): Promise<void> {
  const db = await getDb();
  const schoolCount = await db.collection("schools").countDocuments({ promoterId: id });
  if (schoolCount > 0) throw new Error("Move or remove this promoter's schools before deleting it.");
  const userCount = await db.collection("users").countDocuments({ promoterId: id });
  if (userCount > 0) throw new Error("Remove this promoter's accounts before deleting it.");
  const col = await collection();
  const result = await col.deleteOne({ id });
  if (result.deletedCount === 0) throw new Error("Promoter not found.");
}
