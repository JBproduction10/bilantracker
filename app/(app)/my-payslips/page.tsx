"use client";

import React, { useEffect, useState } from "react";
import { Printer, Eye, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { api, type MyPayslipsResponse } from "@/lib/apiClient";
import { money, initials } from "@/lib/utils";
import type { Payslip } from "@/lib/types";

export default function MyPayslipsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<MyPayslipsResponse | null>(null);
  const [preview, setPreview] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myPayslips().then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!data || !data.employee) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Mes fiches de paie</h1>
            <p className="page-subtitle">Bonjour {session?.user?.name}</p>
          </div>
        </div>
        <div className="card banner">
          <div className="banner-icon"><Eye size={16} /></div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Votre compte n&apos;est pas encore lié à un dossier employé. Contactez l&apos;administrateur de votre école
            pour qu&apos;il associe votre compte à votre fiche du personnel.
          </div>
        </div>
      </>
    );
  }

  const { payslips, school, employee } = data;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes fiches de paie</h1>
          <p className="page-subtitle">{employee.name} · {employee.position} · {school?.name}</p>
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Période</th><th>Brut</th><th>Retenues</th><th>Net à payer</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.period}</td>
                <td className="mono">{money(p.gross)}</td>
                <td className="mono" style={{ color: "var(--red)" }}>{money(-p.totalDeductions)}</td>
                <td className="mono" style={{ fontWeight: 700 }}>{money(p.net)}</td>
                <td><span className={"pill " + (p.status === "sent" ? "pill-sent" : "pill-draft")}>{p.status === "sent" ? "Envoyée" : "Brouillon"}</span></td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setPreview(p)}><Eye size={13} /> Voir</button>
                </td>
              </tr>
            ))}
            {payslips.length === 0 && <tr><td colSpan={6} className="empty">Aucune fiche de paie disponible pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>

      {preview && school && (
        <PayslipModal payslip={preview} employee={employee} schoolName={school.name} schoolColor={school.color} onClose={() => setPreview(null)} />
      )}
    </>
  );
}

function PayslipModal({
  payslip, employee, schoolName, schoolColor, onClose,
}: {
  payslip: Payslip;
  employee: { name: string; position: string; email: string };
  schoolName: string;
  schoolColor: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} id="payslip-print-area">
        <div className="modal-header">
          <div>
            <p className="modal-title">Fiche de paie</p>
            <p className="modal-sub">{schoolName} · {payslip.period}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--cream)", borderRadius: 10, marginBottom: 16 }}>
            <div className="avatar" style={{ background: schoolColor }}>{initials(employee.name)}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{employee.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{employee.position} · {employee.email}</div>
            </div>
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
                <span>Brut</span><span className="mono">{money(payslip.gross)}</span>
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
                <span>Total retenues</span><span className="mono">-{money(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 18, background: "var(--green)", color: "#fff", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>Net à payer</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{money(payslip.net)}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={14} /> Imprimer</button>
        </div>
      </div>
    </div>
  );
}
