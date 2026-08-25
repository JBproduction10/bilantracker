"use client";

import React, { useEffect, useState } from "react";
import { Send, SlidersHorizontal, Eye, X, Printer } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import type { School, Employee, Payslip } from "@/lib/types";

export default function Payslips() {
  const { school } = useSchools();
  const { data: session } = useSession();
  const canManage = session?.user?.role !== "finance";
  const [period, setPeriod] = useState(PERIODS[PERIODS.length - 1]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [showGen, setShowGen] = useState(false);
  const [preview, setPreview] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!school) return;
    setLoading(true);
    const list = await api.listPayslips(school.id, period);
    setPayslips(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school, period]);

  if (!school) return null;

  const totalDeductions = payslips.reduce((s, p) => s + p.totalDeductions, 0);
  const netPayable = payslips.reduce((s, p) => s + p.net, 0);
  const sentCount = payslips.filter((p) => p.status === "sent").length;
  const draftCount = payslips.length - sentCount;

  async function markAllSent() {
    await api.markAllSent(school!.id, period);
    await load();
  }

  async function toggleStatus(p: Payslip) {
    const next = p.status === "sent" ? "draft" : "sent";
    await api.setPayslipStatus(school!.id, p.id, next);
    await load();
    setPreview((prev) => (prev ? { ...prev, status: next } : prev));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fiches de paie</h1>
          <p className="page-subtitle">{period} · {payslips.length} fiches générées</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 150 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          {canManage && (
            <>
              <button className="btn btn-outline" disabled={draftCount === 0} onClick={markAllSent}>
                <Send size={14} /> Tout marquer envoyé {draftCount > 0 && draftCount}
              </button>
              <button className="btn btn-primary" onClick={() => setShowGen(true)}>
                <SlidersHorizontal size={14} /> Générer les fiches
              </button>
            </>
          )}
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Fiches de paie</div><div className="stat-value">{payslips.length}</div><div className="stat-delta">{sentCount} envoyées</div></div>
        <div className="card stat"><div className="stat-label">Total des retenues</div><div className="stat-value mono" style={{ color: "var(--red)" }}>{money(-totalDeductions)}</div></div>
        <div className="card stat"><div className="stat-label">Net à payer</div><div className="stat-value mono">{money(netPayable)}</div><div className="stat-delta">Pour {period}</div></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Employé</th><th>Brut</th><th>Retenues</th><th>Net à payer</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {payslips.map((p) => {
              const emp = school.employees.find((e) => e.id === p.employeeId);
              if (!emp) return null;
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar" style={{ background: school.color }}>{initials(emp.name)}</div>
                      <div><div style={{ fontWeight: 700 }}>{emp.name}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{emp.position}</div></div>
                    </div>
                  </td>
                  <td className="mono">{money(p.gross)}</td>
                  <td className="mono" style={{ color: "var(--red)" }}>{money(-p.totalDeductions)}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{money(p.net)}</td>
                  <td><span className={"pill " + (p.status === "sent" ? "pill-sent" : "pill-draft")}>{p.status === "sent" ? "Envoyée" : "Brouillon"}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setPreview(p)}><Eye size={13} /> Aperçu</button>
                  </td>
                </tr>
              );
            })}
            {!loading && payslips.length === 0 && <tr><td colSpan={6} className="empty">Aucune fiche générée pour {period} pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>

      {showGen && (
        <GenerateModal
          school={school} period={period} setPeriod={setPeriod}
          onClose={() => setShowGen(false)}
          onGenerated={async () => { await load(); setShowGen(false); }}
        />
      )}

      {preview && (
        <PayslipPreviewModal
          payslip={preview}
          employee={school.employees.find((e) => e.id === preview.employeeId)}
          school={school}
          canManage={canManage}
          onClose={() => setPreview(null)}
          onToggleStatus={() => toggleStatus(preview)}
        />
      )}
    </>
  );
}

interface GenerateModalProps {
  school: School;
  period: string;
  setPeriod: (p: string) => void;
  onClose: () => void;
  onGenerated: () => void | Promise<void>;
}

function GenerateModal({ school, period, setPeriod, onClose, onGenerated }: GenerateModalProps) {
  const [busy, setBusy] = useState(false);

  const activeEmployees = school.employees.filter((e) => e.status !== "Inactive");

  async function generate() {
    setBusy(true);
    try {
      await api.generatePayslips(school.id, period);
      onGenerated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="modal-title">Générer les fiches de paie</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Période de paie</label>
          <select className="select-el" style={{ marginBottom: 16 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Aperçu pour {period}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Employés inclus : <span className="mono" style={{ color: "var(--ink)" }}>{activeEmployees.length}</span> employés actifs.
              Toute personne ayant déjà une fiche pour cette période sera ignorée.
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={generate}>{busy ? "Génération…" : "Générer les fiches"}</button>
        </div>
      </div>
    </div>
  );
}

interface PayslipPreviewModalProps {
  payslip: Payslip;
  employee: Employee | undefined;
  school: School;
  canManage: boolean;
  onClose: () => void;
  onToggleStatus: () => void;
}

function PayslipPreviewModal({ payslip, employee, school, canManage, onClose, onToggleStatus }: PayslipPreviewModalProps) {
  const sent = payslip.status === "sent";
  if (!employee) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">Aperçu de la fiche</p>
            <p className="modal-sub">{school.name} · {payslip.period}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--cream)", borderRadius: 10, marginBottom: 16 }}>
            <div className="avatar" style={{ background: school.color }}>{initials(employee.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{employee.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{employee.position} · {employee.email}</div>
            </div>
            <span className={"pill " + (sent ? "pill-sent" : "pill-draft")}>{sent ? "Envoyée" : "Brouillon"}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--green-dark)", fontWeight: 700, marginBottom: 8 }}>Gains</div>
              {payslip.earningsRows.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--muted)" }}>{r.label}</span><span className="mono">+{money(r.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <span>Salaire brut</span><span className="mono">{money(payslip.gross)}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--red)", fontWeight: 700, marginBottom: 8 }}>Retenues</div>
              {payslip.deductionsRows.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--muted)" }}>{r.label}</span><span className="mono">-{money(r.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <span>Total des retenues</span><span className="mono">-{money(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, background: "var(--green)", color: "#fff", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>Net à payer</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{money(payslip.net)}</span>
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{sent ? "Cette fiche a été envoyée." : "Cette fiche est encore un brouillon."}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={() => window.print()}><Printer size={14} /> Imprimer</button>
            {canManage && (
              <button className="btn btn-primary" onClick={onToggleStatus}>{sent ? "Marquer comme brouillon" : "Marquer comme envoyée"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
