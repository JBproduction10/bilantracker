"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Trash2, Pencil, X, Wallet, History, Mail } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import { FEE_STATUS_LABELS, FEE_STATUS_PILL, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, ADJUSTMENT_REASON_LABELS, ADJUSTMENT_REASONS } from "@/lib/constants";
import { isValidEmail } from "@/lib/validation";
import type { StudentWithLedger, FeeStatus, Payment, FeeAdjustment, PaymentMethod, AdjustmentReason, Student } from "@/lib/types";

export default function StudentsPage() {
  const { school } = useSchools();
  const [period, setPeriod] = useState(PERIODS[PERIODS.length - 1]);
  const [students, setStudents] = useState<StudentWithLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | FeeStatus>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<StudentWithLedger | null>(null);
  const [payTarget, setPayTarget] = useState<StudentWithLedger | null>(null);
  const [ledgerTarget, setLedgerTarget] = useState<StudentWithLedger | null>(null);

  const load = async () => {
    if (!school) return;
    setLoading(true);
    const list = await api.listStudents(school.id, period);
    setStudents(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school, period]);

  if (!school) return null;

  const classes = Array.from(new Set(students.map((s) => s.className)));
  const filtered = students.filter((s) => {
    const q = query.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
    const matchC = classFilter === "All" || s.className === classFilter;
    const matchS = statusFilter === "All" || s.ledger.status === statusFilter;
    return matchQ && matchC && matchS;
  });

  const totalDue = students.reduce((s, st) => s + st.ledger.amountDue, 0);
  const totalCollected = students.reduce((s, st) => s + st.ledger.amountPaid, 0);
  const paidCount = students.filter((s) => s.ledger.status === "paid").length;

  async function removeStudent(id: string) {
    await api.removeStudent(school!.id, id);
    await load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Élèves</h1>
          <p className="page-subtitle">{students.length} élèves inscrits à {school.name} · situation pour {period}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 160 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Ajouter un élève</button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="card stat"><div className="stat-label">Effectif total</div><div className="stat-value">{students.length}</div></div>
        <div className="card stat"><div className="stat-label">À jour — {period}</div><div className="stat-value">{paidCount}</div></div>
        <div className="card stat"><div className="stat-label">Attendu — {period}</div><div className="stat-value mono">{money(totalDue)}</div></div>
        <div className="card stat"><div className="stat-label">Encaissé — {period}</div><div className="stat-value mono">{money(totalCollected)}</div><div className="stat-delta">{totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0}% du dû</div></div>
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
          <thead><tr><th>Élève</th><th>Classe</th><th>Dû</th><th>Payé</th><th>Solde</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ background: school.color }}>{initials(s.name)}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.guardianName}{s.guardianPhone ? ` · ${s.guardianPhone}` : ""}</div>
                    </div>
                  </div>
                </td>
                <td>{s.className}</td>
                <td className="mono">{money(s.ledger.amountDue)}</td>
                <td className="mono">{money(s.ledger.amountPaid)}</td>
                <td className="mono" style={{ color: s.ledger.balance > 0 ? "var(--red)" : "var(--green-dark)" }}>{money(s.ledger.balance)}</td>
                <td><span className={"pill " + FEE_STATUS_PILL[s.ledger.status]}>{FEE_STATUS_LABELS[s.ledger.status]}</span></td>
                <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setPayTarget(s)}><Wallet size={13} /> Paiement</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setLedgerTarget(s)}><History size={13} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(s)}><Pencil size={13} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeStudent(s.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="empty">Aucun élève ne correspond à ces filtres.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <StudentModal schoolId={school.id} onClose={() => setShowAdd(false)} onSaved={async () => { await load(); setShowAdd(false); }} />
      )}
      {editTarget && (
        <StudentModal schoolId={school.id} student={editTarget} onClose={() => setEditTarget(null)} onSaved={async () => { await load(); setEditTarget(null); }} />
      )}
      {payTarget && (
        <AddPaymentModal
          schoolId={school.id} student={payTarget} defaultPeriod={period}
          onClose={() => setPayTarget(null)}
          onSaved={async () => { await load(); setPayTarget(null); }}
        />
      )}
      {ledgerTarget && (
        <LedgerModal
          schoolId={school.id} student={ledgerTarget} color={school.color}
          onClose={() => setLedgerTarget(null)}
          onChanged={load}
        />
      )}
    </>
  );
}

function StudentModal({
  schoolId, student, onClose, onSaved,
}: { schoolId: string; student?: StudentWithLedger; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [name, setName] = useState(student?.name || "");
  const [className, setClassName] = useState(student?.className || "");
  const [monthlyFee, setMonthlyFee] = useState(student ? String(student.monthlyFee) : "");
  const [guardianName, setGuardianName] = useState(student?.guardianName || "");
  const [guardianPhone, setGuardianPhone] = useState(student?.guardianPhone || "");
  const [guardianEmail, setGuardianEmail] = useState(student?.guardianEmail || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !className.trim() || !monthlyFee) {
      setError("Renseignez le nom, la classe et le frais mensuel.");
      return;
    }
    if (guardianEmail.trim() && !isValidEmail(guardianEmail)) {
      setError("L'email du tuteur n'est pas valide.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { name: name.trim(), className: className.trim(), monthlyFee: Number(monthlyFee), guardianName, guardianPhone, guardianEmail };
      if (student) await api.updateStudent(schoolId, student.id, body);
      else await api.addStudent(schoolId, body);
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
          <p className="modal-title">{student ? "Modifier l'élève" : "Ajouter un élève"}</p>
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
          <label className="label">Email du tuteur (pour l&apos;envoi des reçus)</label>
          <input className="field" type="email" placeholder="tuteur@email.com" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : student ? "Enregistrer" : "Ajouter l'élève"}</button>
        </div>
      </div>
    </div>
  );
}

/** Adds a single payment transaction to the ledger — never overwrites what came before. */
function AddPaymentModal({
  schoolId, student, defaultPeriod, onClose, onSaved,
}: { schoolId: string; student: StudentWithLedger; defaultPeriod: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isCurrentPeriod = period === defaultPeriod;
  const due = isCurrentPeriod ? student.ledger.amountDue : student.monthlyFee;
  const alreadyPaid = isCurrentPeriod ? student.ledger.amountPaid : null;
  const remaining = alreadyPaid !== null ? Math.max(due - alreadyPaid, 0) : null;

  async function submit() {
    if (!amount || Number(amount) <= 0) {
      setError("Entrez un montant supérieur à zéro.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.addPayment(schoolId, student.id, { period, amount: Number(amount), date, method, note: note.trim() || undefined });
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
          {remaining !== null && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, padding: 10, background: "var(--cream)", borderRadius: 8 }}>
              Dû pour {period} : <span className="mono">{money(due)}</span> · déjà payé : <span className="mono">{money(alreadyPaid || 0)}</span> · reste : <span className="mono" style={{ fontWeight: 700 }}>{money(remaining)}</span>
            </div>
          )}
          <div className="field-row">
            <div>
              <label className="label">Montant payé (FCFA)</label>
              <input className="field" type="number" placeholder="10000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Mode de paiement</label>
              <select className="select-el" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="label">Date</label>
              <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Note (optionnel)</label>
              <input className="field" placeholder="Précision" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            Ce paiement s&apos;ajoute à l&apos;historique — il ne remplace pas les paiements déjà enregistrés pour cette période.
          </div>
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer le paiement"}</button>
        </div>
      </div>
    </div>
  );
}

/** Full transaction history for a student: every payment ever logged, plus any due-amount adjustments. */
function LedgerModal({
  schoolId, student, color, onClose, onChanged,
}: { schoolId: string; student: Student; color: string; onClose: () => void; onChanged: () => void | Promise<void> }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adjustments, setAdjustments] = useState<FeeAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [receiptPeriod, setReceiptPeriod] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.getStudentLedger(schoolId, student.id);
    setPayments(res.payments);
    setAdjustments(res.adjustments);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function voidPayment(pid: string) {
    await api.removePayment(schoolId, student.id, pid);
    await load();
    await onChanged();
  }
  async function removeAdjustment(aid: string) {
    await api.removeFeeAdjustment(schoolId, student.id, aid);
    await load();
    await onChanged();
  }

  // Group payments by period for a clear month-by-month picture.
  const byPeriod = new Map<string, Payment[]>();
  payments.forEach((p) => {
    if (!byPeriod.has(p.period)) byPeriod.set(p.period, []);
    byPeriod.get(p.period)!.push(p);
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">Historique des paiements</p>
            <p className="modal-sub">{student.name} · {student.className} · {money(student.monthlyFee)} / mois</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {notice && (
            <div style={{ fontSize: 12, color: "var(--green-dark)", background: "var(--green-tint)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
              {notice}
            </div>
          )}
          {!loading && byPeriod.size === 0 && adjustments.length === 0 && (
            <div className="empty" style={{ padding: "24px 0" }}>Aucun paiement enregistré pour cet élève.</div>
          )}

          {Array.from(byPeriod.entries()).map(([period, list]) => {
            const total = list.reduce((s, p) => s + p.amount, 0);
            const adj = adjustments.find((a) => a.period === period);
            return (
              <div key={period} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{period}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{money(total)}</div>
                    <button className="btn btn-outline btn-sm" style={{ padding: "3px 8px" }} onClick={() => setReceiptPeriod(period)}>
                      <Mail size={12} /> Envoyer un reçu
                    </button>
                  </div>
                </div>
                {adj && (
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>
                    Ajustement : {ADJUSTMENT_REASON_LABELS[adj.reason]} — dû fixé à {money(adj.amountDue)}
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6, padding: "2px 6px" }} onClick={() => removeAdjustment(adj.id)}>Retirer</button>
                  </div>
                )}
                {list.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: 12.5 }}>{p.date} · {PAYMENT_METHOD_LABELS[p.method]}</div>
                      {p.note && <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.note}</div>}
                      {p.recordedBy && <div style={{ fontSize: 10.5, color: "var(--muted)" }}>Par {p.recordedBy}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono">{money(p.amount)}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => voidPayment(p.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {adjustments.filter((a) => !byPeriod.has(a.period)).map((adj) => (
            <div key={adj.id} style={{ marginBottom: 14, fontSize: 12.5, color: "var(--muted)" }}>
              {adj.period} — {ADJUSTMENT_REASON_LABELS[adj.reason]}, dû fixé à {money(adj.amountDue)}, aucun paiement encore.
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6, padding: "2px 6px" }} onClick={() => removeAdjustment(adj.id)}>Retirer</button>
            </div>
          ))}

          {!showAdjust ? (
            <button className="btn btn-outline btn-sm" onClick={() => setShowAdjust(true)}>Ajuster le montant dû (cas social, remise)</button>
          ) : (
            <AdjustmentForm
              schoolId={schoolId} studentId={student.id} monthlyFee={student.monthlyFee}
              onCancel={() => setShowAdjust(false)}
              onSaved={async () => { setShowAdjust(false); await load(); await onChanged(); }}
            />
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
        </div>
      </div>

      {receiptPeriod && (
        <SendReceiptForm
          schoolId={schoolId} studentId={student.id} period={receiptPeriod}
          defaultEmail={student.guardianEmail || ""} defaultName={student.guardianName || ""}
          onClose={() => setReceiptPeriod(null)}
          onSent={(simulated) => {
            setReceiptPeriod(null);
            setNotice(simulated ? "Reçu envoyé (simulé — configurez le SMTP pour un envoi réel)." : "Reçu envoyé.");
            setTimeout(() => setNotice(null), 4500);
          }}
        />
      )}
    </div>
  );
}

function SendReceiptForm({
  schoolId, studentId, period, defaultEmail, defaultName, onClose, onSent,
}: {
  schoolId: string; studentId: string; period: string; defaultEmail: string; defaultName: string;
  onClose: () => void; onSent: (simulated: boolean) => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!email.trim()) return setError("Entrez un email de destination.");
    if (!isValidEmail(email)) return setError("Cette adresse email n'est pas valide.");
    setBusy(true);
    setError("");
    try {
      const res = await api.sendStudentReceipt(schoolId, studentId, { period, guardianEmail: email.trim(), guardianName: name.trim() || undefined });
      onSent(res.simulated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="modal-title">Envoyer le reçu — {period}</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom du destinataire</label>
          <input className="field" style={{ marginBottom: 14 }} value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label">Email du destinataire</label>
          <input className="field" type="email" placeholder="tuteur@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={send}><Mail size={14} /> {busy ? "Envoi…" : "Envoyer"}</button>
        </div>
      </div>
    </div>
  );
}

function AdjustmentForm({
  schoolId, studentId, monthlyFee, onCancel, onSaved,
}: { schoolId: string; studentId: string; monthlyFee: number; onCancel: () => void; onSaved: () => void | Promise<void> }) {
  const [period, setPeriod] = useState(PERIODS[PERIODS.length - 1]);
  const [amountDue, setAmountDue] = useState(String(monthlyFee));
  const [reason, setReason] = useState<AdjustmentReason>("social_case");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.setFeeAdjustment(schoolId, studentId, { period, amountDue: Number(amountDue), reason, note: note.trim() || undefined });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: 14, marginTop: 10 }}>
      <div className="field-row">
        <div>
          <label className="label">Période</label>
          <select className="select-el" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Raison</label>
          <select className="select-el" value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
            {ADJUSTMENT_REASONS.map((r) => <option key={r} value={r}>{ADJUSTMENT_REASON_LABELS[r]}</option>)}
          </select>
        </div>
      </div>
      <label className="label">Montant dû pour cette période (FCFA)</label>
      <input className="field" style={{ marginBottom: 10 }} type="number" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} />
      <label className="label">Note (optionnel)</label>
      <input className="field" style={{ marginBottom: 10 }} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Appliquer l'ajustement"}</button>
      </div>
    </div>
  );
}
