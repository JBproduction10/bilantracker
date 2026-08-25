"use client";

import React, { useEffect, useState } from "react";
import { Send, Mail, X, AlertTriangle } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import type { Employee, Payslip, SendAllDraftsFailure } from "@/lib/types";

interface ConfirmTarget {
  p: Payslip;
  emp: Employee;
}

export default function SendPayslips() {
  const { school } = useSchools();
  const [period, setPeriod] = useState(PERIODS[PERIODS.length - 1]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failures, setFailures] = useState<SendAllDraftsFailure[]>([]);

  const load = async () => {
    if (!school) return;
    const list = await api.listPayslips(school.id, period);
    setPayslips(list);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school, period]);

  if (!school) return null;

  const drafts = payslips.filter((p) => p.status === "draft");
  const delivered = payslips.filter((p) => p.status === "sent");
  const netPending = drafts.reduce((s, p) => s + p.net, 0);

  async function send(payslip: Payslip) {
    setSendError(null);
    try {
      const result = await api.sendPayslip(school!.id, payslip.id);
      setConfirmTarget(null);
      setNotice(result.simulated ? "Envoyé (simulé — configurez le SMTP pour un envoi réel)." : "Fiche envoyée par email.");
      await load();
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setSendError((err as Error).message || "L'envoi a échoué.");
    }
  }
  async function sendAll() {
    setFailures([]);
    const result = await api.sendAllDrafts(school!.id, period);
    await load();
    if (result.failures.length > 0) {
      // Failures stay visible until dismissed — this is exactly the
      // information a short auto-dismissing toast would have hidden.
      setFailures(result.failures);
      setNotice(
        result.sent > 0
          ? `${result.sent} fiche${result.sent > 1 ? "s" : ""} envoyée${result.sent > 1 ? "s" : ""}, ${result.failures.length} échec${result.failures.length > 1 ? "s" : ""}.`
          : `Aucune fiche envoyée — ${result.failures.length} échec${result.failures.length > 1 ? "s" : ""}.`
      );
    } else {
      setNotice(result.simulated ? `${result.sent} fiches envoyées (simulé — configurez le SMTP pour un envoi réel).` : `${result.sent} fiches envoyées.`);
      setTimeout(() => setNotice(null), 4000);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Envoyer les fiches de paie</h1>
          <p className="page-subtitle">Envoyer les fiches de {period} à votre équipe.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 150 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary" disabled={drafts.length === 0} onClick={sendAll}>
            <Send size={14} /> Tout envoyer {drafts.length > 0 && drafts.length}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className="card banner"
          style={
            failures.length > 0
              ? { borderColor: "var(--red)", background: "#F7E7DF" }
              : { borderColor: "var(--green)", background: "var(--green-tint)" }
          }
        >
          <span style={{ fontSize: 13, color: failures.length > 0 ? "var(--red)" : "var(--green-dark)" }}>{notice}</span>
        </div>
      )}

      {failures.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 20, border: "1px solid var(--red)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, color: "var(--red)" }}>
              <AlertTriangle size={15} /> Envois échoués
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setFailures([])}><X size={14} /></button>
          </div>
          {failures.map((f) => (
            <div key={f.payslipId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 600 }}>{f.employeeName}</span>
              <span style={{ color: "var(--muted)" }}>{f.reason}</span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
            Ces fiches sont restées en brouillon. Corrigez le problème (souvent un email manquant ou invalide) et renvoyez-les individuellement ci-dessous.
          </div>
        </div>
      )}

      <div className="card banner">
        <div className="banner-icon"><Mail size={16} /></div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Les emails passent par la configuration du serveur. Sans identifiants SMTP configurés, les envois sont simulés (journalisés, pas réellement délivrés) pour tester tout le parcours en toute sécurité.
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Prêtes à envoyer</div><div className="stat-value">{drafts.length}</div></div>
        <div className="card stat"><div className="stat-label">Net en attente</div><div className="stat-value mono">{money(netPending)}</div></div>
        <div className="card stat"><div className="stat-label">Envoyées</div><div className="stat-value">{delivered.length}</div></div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Prêtes à envoyer</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <table className="tbl">
          <thead><tr><th>Employé</th><th>Département</th><th>Net à payer</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {drafts.map((p) => {
              const emp = school.employees.find((e) => e.id === p.employeeId);
              if (!emp) return null;
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar" style={{ background: school.color }}>{initials(emp.name)}</div>
                      <div style={{ fontWeight: 700 }}>{emp.name}</div>
                    </div>
                  </td>
                  <td>{emp.department}</td>
                  <td className="mono">{money(p.net)}</td>
                  <td style={{ color: "var(--muted)" }}>{emp.email}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { setSendError(null); setConfirmTarget({ p, emp }); }}><Send size={13} /> Envoyer</button>
                  </td>
                </tr>
              );
            })}
            {drafts.length === 0 && <tr><td colSpan={5} className="empty">Toutes les fiches de {period} ont été envoyées.</td></tr>}
          </tbody>
        </table>
      </div>

      {delivered.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Envoyées</div>
          <div className="dept-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {delivered.map((p) => {
              const emp = school.employees.find((e) => e.id === p.employeeId);
              if (!emp) return null;
              return (
                <div key={p.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar" style={{ background: school.color }}>{initials(emp.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{emp.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--green-dark)" }}>Envoyée</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirmTarget && (
        <div className="modal-overlay" onClick={() => setConfirmTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="modal-title">Confirmer l'envoi</p>
              <button className="close-btn" onClick={() => setConfirmTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div className="avatar" style={{ background: school.color }}>{initials(confirmTarget.emp.name)}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{confirmTarget.emp.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{confirmTarget.emp.department}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Net à payer</div>
                  <div className="mono" style={{ fontWeight: 700 }}>{money(confirmTarget.p.net)}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Envoyer la fiche de {period} à <strong style={{ color: "var(--ink)" }}>{confirmTarget.emp.email}</strong> ? Elle sera marquée comme envoyée.
              </div>
              {sendError && <div className="error-text" style={{ marginTop: 10 }}>{sendError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setConfirmTarget(null); setSendError(null); }}>Annuler</button>
              <button className="btn btn-primary" onClick={() => send(confirmTarget!.p)}><Send size={14} /> Confirmer l'envoi</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
