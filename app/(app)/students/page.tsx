"use client";

import React, { useState } from "react";
import { Plus, Search, Trash2, X, Wallet } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import { FEE_STATUS_LABELS, FEE_STATUS_PILL } from "@/lib/constants";
import type { Student, FeeStatus } from "@/lib/types";

export default function StudentsPage() {
  const { school, refresh } = useSchools();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | FeeStatus>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [payTarget, setPayTarget] = useState<Student | null>(null);

  if (!school) return null;

  const classes = Array.from(new Set(school.students.map((s) => s.className)));
  const filtered = school.students.filter((s) => {
    const q = query.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
    const matchC = classFilter === "All" || s.className === classFilter;
    const matchS = statusFilter === "All" || s.status === statusFilter;
    return matchQ && matchC && matchS;
  });

  const totalDue = school.students.reduce((s, st) => s + st.monthlyFee, 0);
  const paidCount = school.students.filter((s) => s.status === "paid").length;
  const totalCollected = school.students.reduce((sum, st) => {
    const latest = st.records[st.records.length - 1];
    return sum + (latest?.amountPaid || 0);
  }, 0);

  async function removeStudent(id: string) {
    await api.removeStudent(school!.id, id);
    await refresh();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Élèves</h1>
          <p className="page-subtitle">{school.students.length} élèves inscrits à {school.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Ajouter un élève</button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Effectif total</div><div className="stat-value">{school.students.length}</div></div>
        <div className="card stat"><div className="stat-label">À jour de paiement</div><div className="stat-value">{paidCount}</div></div>
        <div className="card stat"><div className="stat-label">Encaissé (dernier relevé)</div><div className="stat-value mono">{money(totalCollected)}</div><div className="stat-delta">Sur {money(totalDue)} attendu / mois</div></div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="search-box" style={{ flex: 1, width: "auto" }}>
          <Search size={14} />
          <input
            style={{ border: "none", background: "none", outline: "none", width: "100%", fontSize: 13, color: "var(--ink)" }}
            placeholder="Rechercher un élève, une classe…" value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select-el" style={{ width: 180 }} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="All">Toutes les classes</option>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="select-el" style={{ width: 170 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | FeeStatus)}>
          <option value="All">Tous les statuts</option>
          {(Object.keys(FEE_STATUS_LABELS) as FeeStatus[]).map((s) => <option key={s} value={s}>{FEE_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Élève</th><th>Classe</th><th>Frais mensuel</th><th>Tuteur</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ background: school.color }}>{initials(s.name)}</div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                  </div>
                </td>
                <td>{s.className}</td>
                <td className="mono">{money(s.monthlyFee)}</td>
                <td style={{ color: "var(--muted)" }}>{s.guardianName}{s.guardianPhone ? ` · ${s.guardianPhone}` : ""}</td>
                <td><span className={"pill " + FEE_STATUS_PILL[s.status]}>{FEE_STATUS_LABELS[s.status]}</span></td>
                <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setPayTarget(s)}><Wallet size={13} /> Paiement</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeStudent(s.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="empty">Aucun élève ne correspond à ces filtres.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddStudentModal schoolId={school.id} onClose={() => setShowAdd(false)} onAdded={async () => { await refresh(); setShowAdd(false); }} />
      )}
      {payTarget && (
        <RecordPaymentModal
          schoolId={school.id} student={payTarget}
          onClose={() => setPayTarget(null)}
          onSaved={async () => { await refresh(); setPayTarget(null); }}
        />
      )}
    </>
  );
}

function AddStudentModal({ schoolId, onClose, onAdded }: { schoolId: string; onClose: () => void; onAdded: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !className.trim() || !monthlyFee) {
      setError("Renseignez le nom, la classe et le frais mensuel.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.addStudent(schoolId, { name: name.trim(), className: className.trim(), monthlyFee: Number(monthlyFee), guardianName, guardianPhone });
      onAdded();
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
          <p className="modal-title">Ajouter un élève</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom complet</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Marie Ateba" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="field-row">
            <div>
              <label className="label">Classe</label>
              <input className="field" placeholder="ex. CM2" value={className} onChange={(e) => setClassName(e.target.value)} />
            </div>
            <div>
              <label className="label">Frais mensuel (FCFA)</label>
              <input className="field" type="number" placeholder="25000" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="label">Nom du tuteur</label>
              <input className="field" placeholder="ex. Mme Ateba" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div>
              <label className="label">Téléphone du tuteur</label>
              <input className="field" placeholder="6XX XXX XXX" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
            </div>
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Ajout…" : "Ajouter l'élève"}</button>
        </div>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  schoolId, student, onClose, onSaved,
}: { schoolId: string; student: Student; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [period, setPeriod] = useState(PERIODS[2]);
  const [amountPaid, setAmountPaid] = useState(String(student.monthlyFee));
  const [status, setStatus] = useState<FeeStatus>("paid");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const existing = student.records.find((r) => r.period === period);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.recordFeePayment(schoolId, student.id, {
        period, amountDue: student.monthlyFee, amountPaid: status === "unpaid" ? 0 : Number(amountPaid), status,
      });
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
          <div>
            <p className="modal-title">Enregistrer un paiement</p>
            <p className="modal-sub">{student.name} · {student.className}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Période</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          {existing && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
              Déjà enregistré pour cette période : {FEE_STATUS_LABELS[existing.status]}, {money(existing.amountPaid)} payé. L&apos;enregistrement le remplacera.
            </div>
          )}
          <div className="field-row">
            <div>
              <label className="label">Statut</label>
              <select className="select-el" value={status} onChange={(e) => setStatus(e.target.value as FeeStatus)}>
                {(Object.keys(FEE_STATUS_LABELS) as FeeStatus[]).map((s) => <option key={s} value={s}>{FEE_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Montant payé (FCFA)</label>
              <input
                className="field" type="number" value={status === "unpaid" ? 0 : amountPaid}
                disabled={status === "unpaid"}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Frais dû pour la période : <span className="mono">{money(student.monthlyFee)}</span></div>
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
