"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Send, Ban, Coins } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, PERIODS } from "@/lib/utils";
import { SALARY_GRID_STATUS_LABELS, SALARY_GRID_STATUS_PILL } from "@/lib/constants";
import type { SalaryGridSubmission, SalaryGridStatus } from "@/lib/types";

export default function SalaryGridPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (role === "treasury") return <TreasurySalaryGrid />;
  if (role === "super_admin") return <SuperAdminSalaryGrid />;
  return <ReadOnlySalaryGrid />;
}

/* ---------- Bonté Service: push base salaries for a school + period ---------- */
function TreasurySalaryGrid() {
  const { school } = useSchools();
  const [period, setPeriod] = useState(PERIODS[2]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [submissions, setSubmissions] = useState<SalaryGridSubmission[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeEmployees = useMemo(() => (school?.employees || []).filter((e) => e.status !== "Inactive"), [school]);

  const load = async () => {
    if (!school) return;
    setLoading(true);
    const list = await api.listSalaryGridSubmissions(school.id);
    setSubmissions(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (school) {
      const prefill: Record<string, string> = {};
      activeEmployees.forEach((e) => { prefill[e.id] = String(e.baseSalary); });
      setAmounts(prefill);
    }
    // eslint-disable-next-line
  }, [school]);

  if (!school) return null;

  async function submit() {
    const entries = activeEmployees
      .map((e) => ({ employeeId: e.id, baseSalary: amounts[e.id] }))
      .filter((e) => e.baseSalary && Number(e.baseSalary) > 0);
    if (!entries.length) {
      setError("Renseignez au moins un salaire de base.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (!school) return;
      await api.submitSalaryGrid(school.id, { period, entries, note: note.trim() });
      setNote("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Grille salariale</h1>
          <p className="page-subtitle">Envoyer les salaires de base à appliquer pour {school.name}</p>
        </div>
        <select className="select-el" style={{ width: 170 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>Salaires de base — {period}</div>
        <table className="tbl">
          <thead><tr><th>Employé</th><th>Poste</th><th>Salaire actuel</th><th>Nouveau salaire de base</th></tr></thead>
          <tbody>
            {activeEmployees.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td style={{ color: "var(--muted)" }}>{e.position}</td>
                <td className="mono" style={{ color: "var(--muted)" }}>{money(e.baseSalary)}</td>
                <td>
                  <input
                    className="field" type="number" style={{ maxWidth: 160 }}
                    value={amounts[e.id] ?? ""}
                    onChange={(ev) => setAmounts((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                  />
                </td>
              </tr>
            ))}
            {activeEmployees.length === 0 && <tr><td colSpan={4} className="empty">Aucun employé actif dans cette école.</td></tr>}
          </tbody>
        </table>
        <label className="label" style={{ marginTop: 14 }}>Note pour le super admin (optionnel)</label>
        <input className="field" placeholder="Précision sur cette grille" value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || activeEmployees.length === 0} onClick={submit}>
          <Coins size={15} /> {busy ? "Envoi…" : "Envoyer la grille"}
        </button>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 14.5, padding: "14px 18px 0" }}>Historique des envois — {school.name}</div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Période</th><th>Employés</th><th>Statut</th><th>Fiches générées</th><th>Envoyées</th></tr></thead>
          <tbody>
            {submissions.filter(Boolean).map((s) => (
              <tr key={s.id}>
                <td style={{ color: "var(--muted)" }}>{new Date(s.submittedAt).toLocaleDateString("fr-FR")}</td>
                <td>{s.period}</td>
                <td>{s.entries.length}</td>
                <td><span className={"pill " + SALARY_GRID_STATUS_PILL[s.status]}>{SALARY_GRID_STATUS_LABELS[s.status]}</span></td>
                <td>{s.generatedCount ?? "—"}</td>
                <td>{s.sentCount ?? "—"}</td>
              </tr>
            ))}
            {!loading && submissions.length === 0 && <tr><td colSpan={6} className="empty">Aucune grille envoyée.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- super admin: network-wide queue, applies (generates + sends) or rejects ---------- */
function SuperAdminSalaryGrid() {
  const [status, setStatus] = useState<SalaryGridStatus | "">("pending");
  const [submissions, setSubmissions] = useState<SalaryGridSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<SalaryGridSubmission | null>(null);
  const [action, setAction] = useState<"apply" | "reject" | null>(null);
  const [result, setResult] = useState<{ submission: SalaryGridSubmission } | null>(null);

  const load = async () => {
    setLoading(true);
    const list = await api.listAllSalaryGridSubmissions(status || undefined);
    setSubmissions(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Grille salariale</h1>
          <p className="page-subtitle">File réseau des grilles envoyées par Bonté Service</p>
        </div>
        <select className="select-el" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value as SalaryGridStatus | "")}>
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="applied">Appliquée</option>
          <option value="rejected">Refusée</option>
        </select>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>École</th><th>Période</th><th>Employés</th><th>Note</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {submissions.filter(Boolean).map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.schoolName}</td>
                <td>{s.period}</td>
                <td>{s.entries.length}</td>
                <td style={{ color: "var(--muted)" }}>{s.note || "—"}</td>
                <td><span className={"pill " + SALARY_GRID_STATUS_PILL[s.status]}>{SALARY_GRID_STATUS_LABELS[s.status]}</span></td>
                <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {s.status === "pending" && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => { setTarget(s); setAction("apply"); }}>
                        <Send size={13} /> Appliquer & envoyer
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Refuser" onClick={() => { setTarget(s); setAction("reject"); }}><Ban size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && submissions.length === 0 && <tr><td colSpan={6} className="empty">Aucune grille salariale.</td></tr>}
          </tbody>
        </table>
      </div>

      {target && action && (
        <DecisionModal
          submission={target} action={action}
          onClose={() => { setTarget(null); setAction(null); }}
          onDone={async (res) => { await load(); setTarget(null); setAction(null); if (res) setResult(res); }}
        />
      )}

      {result && (
        <div className="modal-overlay" onClick={() => setResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="modal-title">Grille appliquée — {result.submission.schoolName}</p>
              <button className="close-btn" onClick={() => setResult(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>{result.submission.generatedCount ?? 0} fiche(s) générée(s) pour {result.submission.period}.</p>
              <p>{result.submission.sentCount ?? 0} fiche(s) envoyée(s) aux employés.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setResult(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DecisionModal({
  submission, action, onClose, onDone,
}: { submission: SalaryGridSubmission; action: "apply" | "reject"; onClose: () => void; onDone: (res: { submission: SalaryGridSubmission } | null) => void | Promise<void> }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const title = action === "apply" ? "Appliquer et envoyer les fiches" : "Refuser cette grille";

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await api.decideSalaryGrid(submission.schoolId, submission.id, { action, note: note.trim() || undefined });
      onDone(action === "apply" ? res : null);
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
            <p className="modal-title">{title}</p>
            <p className="modal-sub">{submission.schoolName} — {submission.entries.length} employé(s), période {submission.period}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {action === "apply" && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
              Les salaires de base seront mis à jour, les fiches de paie de {submission.period} générées, puis envoyées directement aux employés.
            </div>
          )}
          <label className="label">Note (optionnel)</label>
          <input className="field" placeholder="Précision" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "…" : "Confirmer"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- promoter / school_admin: read-only visibility ---------- */
function ReadOnlySalaryGrid() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { school } = useSchools();
  const [submissions, setSubmissions] = useState<SalaryGridSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (role === "school_admin") {
        if (!school) return;
        setSubmissions(await api.listSalaryGridSubmissions(school.id));
      } else {
        setSubmissions(await api.listAllSalaryGridSubmissions());
      }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [role, school]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Grille salariale</h1>
          <p className="page-subtitle">Grilles envoyées par Bonté Service{school && role === "school_admin" ? ` — ${school.name}` : ""}</p>
        </div>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr>{role !== "school_admin" && <th>École</th>}<th>Période</th><th>Employés</th><th>Statut</th><th>Fiches générées</th><th>Envoyées</th></tr></thead>
          <tbody>
            {submissions.filter(Boolean).map((s) => (
              <tr key={s.id}>
                {role !== "school_admin" && <td style={{ fontWeight: 600 }}>{s.schoolName}</td>}
                <td>{s.period}</td>
                <td>{s.entries.length}</td>
                <td><span className={"pill " + SALARY_GRID_STATUS_PILL[s.status]}>{SALARY_GRID_STATUS_LABELS[s.status]}</span></td>
                <td>{s.generatedCount ?? "—"}</td>
                <td>{s.sentCount ?? "—"}</td>
              </tr>
            ))}
            {!loading && submissions.length === 0 && <tr><td colSpan={role !== "school_admin" ? 6 : 5} className="empty">Aucune grille salariale.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
