"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, X, PackagePlus, ShoppingCart, Settings2 } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, PERIODS } from "@/lib/utils";
import { INVENTORY_CATEGORY_LABELS, INVENTORY_CATEGORIES, STOCK_MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import type { InventoryItem, StockMovement, InventoryCategory, StockMovementType, InventorySummary } from "@/lib/types";

export default function InventoryPage() {
  const { school } = useSchools();
  const [period, setPeriod] = useState(PERIODS[2]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMovement, setShowMovement] = useState<StockMovementType | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!school) return;
    setLoading(true);
    const [i, m, s] = await Promise.all([
      api.listInventoryItems(school.id),
      api.listStockMovements(school.id),
      api.getInventorySummary(school.id, period),
    ]);
    setItems(i);
    setMovements(m);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school, period]);

  if (!school) return null;

  async function removeItem(id: string) {
    if (!school) return;
    await api.removeInventoryItem(school.id, id);
    await load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Intendance & Logistique</h1>
          <p className="page-subtitle">Fournitures (uniformes, chaussures, pulls) — {school.name}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 150 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-outline" onClick={() => setShowAddItem(true)}><Plus size={15} /> Article</button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Valeur du stock</div><div className="stat-value mono">{money(summary?.stockValue || 0)}</div></div>
        <div className="card stat"><div className="stat-label">Unités vendues — {period}</div><div className="stat-value">{summary?.unitsSoldInPeriod || 0}</div></div>
        <div className="card stat"><div className="stat-label">Revenu des ventes — {period}</div><div className="stat-value mono">{money(summary?.revenueInPeriod || 0)}</div></div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px 0" }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Articles en stock</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowMovement("in")}><PackagePlus size={13} /> Réception</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowMovement("sale")}><ShoppingCart size={13} /> Vente</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowMovement("adjustment")}><Settings2 size={13} /> Ajustement</button>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Article</th><th>Catégorie</th><th>Prix unitaire</th><th>Quantité en stock</th><th>Valeur</th><th></th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td style={{ fontWeight: 600 }}>{i.name}</td>
                <td><span className="pill pill-leave">{INVENTORY_CATEGORY_LABELS[i.category]}</span></td>
                <td className="mono">{money(i.unitPrice)}</td>
                <td className="mono" style={{ color: i.quantityOnHand === 0 ? "var(--red)" : undefined }}>{i.quantityOnHand}</td>
                <td className="mono">{money(i.unitPrice * i.quantityOnHand)}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(i.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="empty">Aucun article enregistré.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 14.5, padding: "14px 18px 0" }}>Historique des mouvements</div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Article</th><th>Mouvement</th><th>Quantité</th><th>Montant</th><th>Note</th></tr></thead>
          <tbody>
            {movements.slice(0, 30).map((m) => (
              <tr key={m.id}>
                <td style={{ color: "var(--muted)" }}>{m.date}</td>
                <td>{m.itemName}</td>
                <td><span className={"pill " + (m.type === "sale" ? "pill-sent" : m.type === "in" ? "pill-leave" : "pill-draft")}>{STOCK_MOVEMENT_TYPE_LABELS[m.type]}</span></td>
                <td className="mono">{m.type === "sale" ? "-" : m.type === "adjustment" && m.quantity < 0 ? "" : "+"}{m.quantity}</td>
                <td className="mono">{m.amount ? money(m.amount) : "—"}</td>
                <td style={{ color: "var(--muted)" }}>{m.note || "—"}</td>
              </tr>
            ))}
            {!loading && movements.length === 0 && <tr><td colSpan={6} className="empty">Aucun mouvement enregistré.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAddItem && (
        <AddItemModal schoolId={school.id} onClose={() => setShowAddItem(false)} onSaved={async () => { await load(); setShowAddItem(false); }} />
      )}
      {showMovement && (
        <MovementModal
          schoolId={school.id} type={showMovement} items={items} defaultPeriod={period}
          onClose={() => setShowMovement(null)}
          onSaved={async () => { await load(); setShowMovement(null); }}
        />
      )}
    </>
  );
}

function AddItemModal({ schoolId, onClose, onSaved }: { schoolId: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("uniform");
  const [unitPrice, setUnitPrice] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !unitPrice) {
      setError("Renseignez le nom et le prix unitaire.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.addInventoryItem(schoolId, { name: name.trim(), category, unitPrice: Number(unitPrice), initialQuantity: Number(initialQuantity) || 0 });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="modal-title">Ajouter un article</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom de l&apos;article</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Uniforme complet primaire" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="field-row">
            <div>
              <label className="label">Catégorie</label>
              <select className="select-el" value={category} onChange={(e) => setCategory(e.target.value as InventoryCategory)}>
                {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{INVENTORY_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prix unitaire (FC)</label>
              <input className="field" type="number" placeholder="12000" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>
          <label className="label">Quantité initiale</label>
          <input className="field" type="number" value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} />
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Ajouter"}</button>
        </div>
      </div>
    </div>
  );
}

function MovementModal({
  schoolId, type, items, defaultPeriod, onClose, onSaved,
}: { schoolId: string; type: StockMovementType; items: InventoryItem[]; defaultPeriod: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [itemId, setItemId] = useState(items[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [period, setPeriod] = useState(defaultPeriod);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const title = type === "in" ? "Réception de stock" : type === "sale" ? "Vente" : "Ajustement d'inventaire";

  async function submit() {
    if (!itemId || !quantity) {
      setError("Choisissez un article et une quantité.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.addStockMovement(schoolId, {
        itemId, type, quantity: Number(quantity),
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
        period, date, note: note.trim(),
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <p className="modal-title">{title}</p>
            <button className="close-btn" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="modal-body">Ajoutez d&apos;abord un article avant d&apos;enregistrer un mouvement.</div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Fermer</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="modal-title">{title}</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Article</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.quantityOnHand} en stock)</option>)}
          </select>
          <div className="field-row">
            <div>
              <label className="label">Quantité{type === "adjustment" ? " (± pour correction)" : ""}</label>
              <input className="field" type="number" placeholder={type === "adjustment" ? "-2" : "10"} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className="label">Prix unitaire (optionnel)</label>
              <input className="field" type="number" placeholder="Prix par défaut de l'article" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="label">Période</label>
              <select className="select-el" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {PERIODS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <label className="label">Note (optionnel)</label>
          <input className="field" placeholder="Précision" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  );
}
