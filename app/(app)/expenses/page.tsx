"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, PERIODS } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants";
import type { Expense, ExpenseCategory } from "@/lib/types";

export default function ExpensesPage() {
  const { school } = useSchools();
  const { data: session } = useSession();
  // Logging expenses is a cashier duty (same separation of duties as
  // student/fee records) — a school admin sees this list read-only.
  const role = session?.user?.role;
  const canEdit = role === "cashier" || role === "super_admin";
  const [period, setPeriod] = useState(PERIODS[2]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!school) return;
    setLoading(true);
    const list = await api.listExpenses(school.id, period);
    setExpenses(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school, period]);

  if (!school) return null;

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    cat, total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  async function removeExpense(id: string) {
    await api.removeExpense(school!.id, id);
    await load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dépenses</h1>
          <p className="page-subtitle">{period} · {expenses.length} sorties pour {school.name}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 150 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Ajouter une dépense</button>
          )}
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Total des dépenses</div><div className="stat-value mono" style={{ color: "var(--red)" }}>{money(total)}</div></div>
        {byCategory.slice(0, 2).map((c) => (
          <div key={c.cat} className="card stat">
            <div className="stat-label">{EXPENSE_CATEGORY_LABELS[c.cat]}</div>
            <div className="stat-value mono">{money(c.total)}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Catégorie</th><th>Libellé</th><th>Montant</th><th></th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td style={{ color: "var(--muted)" }}>{e.date}</td>
                <td><span className="pill pill-leave">{EXPENSE_CATEGORY_LABELS[e.category]}</span></td>
                <td style={{ fontWeight: 600 }}>{e.label}{e.note ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> — {e.note}</span> : null}</td>
                <td className="mono" style={{ color: "var(--red)" }}>{money(-e.amount)}</td>
                <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {canEdit && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(e)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeExpense(e.id)}><Trash2 size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && expenses.length === 0 && <tr><td colSpan={5} className="empty">Aucune dépense enregistrée pour {period}.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <ExpenseModal
          schoolId={school.id} defaultPeriod={period}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { await load(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <ExpenseModal
          schoolId={school.id} expense={editTarget} defaultPeriod={period}
          onClose={() => setEditTarget(null)}
          onSaved={async () => { await load(); setEditTarget(null); }}
        />
      )}
    </>
  );
}

function ExpenseModal({
  schoolId, expense, defaultPeriod, onClose, onSaved,
}: { schoolId: string; expense?: Expense; defaultPeriod: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || "fuel");
  const [label, setLabel] = useState(expense?.label || "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [period, setPeriod] = useState(expense?.period || defaultPeriod);
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(expense?.note || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!label.trim() || !amount) {
      setError("Renseignez le libellé et le montant.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { category, label: label.trim(), amount: Number(amount), period, date, note: note.trim() };
      if (expense) await api.updateExpense(schoolId, expense.id, body);
      else await api.addExpense(schoolId, body);
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
          <p className="modal-title">{expense ? "Modifier la dépense" : "Ajouter une dépense"}</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div>
              <label className="label">Catégorie</label>
              <select className="select-el" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Montant (FC)</label>
              <input className="field" type="number" placeholder="45000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <label className="label">Libellé</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Carburant groupe électrogène" value={label} onChange={(e) => setLabel(e.target.value)} />
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
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : expense ? "Enregistrer" : "Ajouter"}</button>
        </div>
      </div>
    </div>
  );
}
