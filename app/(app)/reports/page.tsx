"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Users, AlertTriangle } from "lucide-react";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import type { SchoolReport } from "@/lib/types";

export default function ReportsPage() {
  const [period, setPeriod] = useState(PERIODS[2]);
  const [reports, setReports] = useState<SchoolReport[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAllReports(period).then((list) => {
      setReports(list);
      setLoading(false);
    });
  }, [period]);

  const totals = reports.reduce(
    (acc, r) => ({
      income: acc.income + r.totalIncome,
      outflow: acc.outflow + r.totalOutflow,
      students: acc.students + r.studentsTotal,
      unpaid: acc.unpaid + r.studentsUnpaid,
    }),
    { income: 0, outflow: 0, students: 0, unpaid: 0 }
  );
  const netTotal = totals.income - totals.outflow;
  const detail = reports.find((r) => r.schoolId === selected) || null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bilans</h1>
          <p className="page-subtitle">Situation financière consolidée des {reports.length} écoles</p>
        </div>
        <select className="select-el" style={{ width: 170 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p}>{p}</option>)}
          <option value="all">Toutes les périodes</option>
        </select>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat-icon" style={{ background: "var(--sage-tint)", color: "var(--green-dark)" }}><Users size={16} /></div>
          <div className="stat-label">Élèves (toutes écoles)</div>
          <div className="stat-value">{totals.students}</div>
          <div className="stat-delta">{totals.unpaid} non à jour</div>
        </div>
        <div className="card stat">
          <div className="stat-icon" style={{ background: "var(--green-tint)", color: "var(--green-dark)" }}><TrendingUp size={16} /></div>
          <div className="stat-label">Total encaissé</div>
          <div className="stat-value mono">{money(totals.income)}</div>
        </div>
        <div className="card stat">
          <div className="stat-icon" style={{ background: "var(--gold-tint)", color: "#8A6420" }}><TrendingDown size={16} /></div>
          <div className="stat-label">Total sorties</div>
          <div className="stat-value mono">{money(totals.outflow)}</div>
        </div>
        <div className="card stat">
          <div className="stat-icon" style={{ background: netTotal >= 0 ? "var(--green-tint)" : "var(--red-tint, #F7E7DF)", color: netTotal >= 0 ? "var(--green-dark)" : "var(--red)" }}>
            {netTotal >= 0 ? <TrendingUp size={16} /> : <AlertTriangle size={16} />}
          </div>
          <div className="stat-label">Solde net</div>
          <div className="stat-value mono">{money(netTotal)}</div>
        </div>
      </div>

      <div className="dept-grid">
        {reports.map((r) => (
          <div
            key={r.schoolId} className="card dept-card"
            style={{ cursor: "pointer", borderColor: selected === r.schoolId ? r.color : undefined }}
            onClick={() => setSelected(selected === r.schoolId ? null : r.schoolId)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div className="avatar" style={{ background: r.color, width: 34, height: 34, borderRadius: 8 }}>{initials(r.schoolName)}</div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.schoolName}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, fontSize: 12.5 }}>
              <div><div style={{ color: "var(--muted)" }}>Élèves</div><div className="mono" style={{ fontWeight: 700 }}>{r.studentsTotal}</div></div>
              <div><div style={{ color: "var(--muted)" }}>Non payés</div><div className="mono" style={{ fontWeight: 700, color: r.studentsUnpaid > 0 ? "var(--red)" : undefined }}>{r.studentsUnpaid}</div></div>
              <div><div style={{ color: "var(--muted)" }}>Encaissé</div><div className="mono" style={{ fontWeight: 700 }}>{money(r.totalIncome)}</div></div>
              <div><div style={{ color: "var(--muted)" }}>Sorties</div><div className="mono" style={{ fontWeight: 700 }}>{money(r.totalOutflow)}</div></div>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingTop: 10, borderTop: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Solde net</span>
              <span className="mono" style={{ fontWeight: 700, color: r.netBalance >= 0 ? "var(--green-dark)" : "var(--red)" }}>{money(r.netBalance)}</span>
            </div>
          </div>
        ))}
        {!loading && reports.length === 0 && <div className="empty">Aucune école à afficher.</div>}
      </div>

      {detail && (
        <div className="card" style={{ marginTop: 20, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div className="avatar" style={{ background: detail.color }}>{initials(detail.schoolName)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{detail.schoolName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Bilan détaillé · {period === "all" ? "toutes périodes" : period}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--green-dark)", fontWeight: 700, marginBottom: 10 }}>Entrées — élèves</div>
              <Row label="Élèves inscrits" value={String(detail.studentsTotal)} />
              <Row label="À jour" value={String(detail.studentsPaid)} />
              <Row label="Partiel" value={String(detail.studentsPartial)} />
              <Row label="Non payé" value={String(detail.studentsUnpaid)} highlight={detail.studentsUnpaid > 0} />
              <Row label="Cas sociaux" value={String(detail.studentsSocialCase)} />
              <Row label="Total attendu" value={money(detail.totalDue)} />
              <Row label="Total encaissé" value={money(detail.totalIncome)} bold />
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--red)", fontWeight: 700, marginBottom: 10 }}>Sorties</div>
              <Row label="Salaires versés" value={money(detail.totalSalariesSent)} />
              <Row label="Salaires en attente" value={money(detail.totalSalariesDraft)} />
              <Row label="Dépenses de fonctionnement" value={money(detail.totalExpenses)} />
              <Row label="Total sorties" value={money(detail.totalOutflow)} bold />
            </div>
          </div>

          <div style={{
            marginTop: 20, borderRadius: 10, padding: "14px 16px",
            background: detail.netBalance >= 0 ? "var(--green)" : "var(--red)", color: "#fff",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13 }}>Solde net (encaissé − sorties)</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{money(detail.netBalance)}</span>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 9, fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="mono" style={{ color: highlight ? "var(--red)" : undefined }}>{value}</span>
    </div>
  );
}
