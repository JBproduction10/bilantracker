"use client";

import React, { useEffect, useState } from "react";
import { Landmark, FileText, GraduationCap, Wallet, TrendingUp, ArrowRight, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import { PURCHASE_ORDER_STATUS_LABELS, PURCHASE_ORDER_STATUS_PILL } from "@/lib/constants";
import type { Payslip, SchoolReport, PurchaseOrder } from "@/lib/types";

export default function Dashboard() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (role === "promoter") return <PromoterDashboard />;
  if (role === "finance") return <FinanceDashboard />;
  if (role === "treasury") return <TreasuryDashboard />;
  return <SchoolDashboard />;
}

/* ---------- super_admin & school_admin: single-school operational view ---------- */
function SchoolDashboard() {
  const { school } = useSchools();
  const [period, setPeriod] = useState(PERIODS[2]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [report, setReport] = useState<SchoolReport | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!school) return;
    api.listPayslips(school.id, period).then(setPayslips).catch(() => setPayslips([]));
    api.getSchoolReport(school.id, period).then(setReport).catch(() => setReport(null));
  }, [school, period]);

  if (!school) return null;

  const totalEmployees = school.employees.length;
  const monthlyPayroll = school.employees.reduce((s, e) => s + e.baseSalary, 0);
  const pending = payslips.filter((p) => p.status === "draft").length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d&apos;ensemble de {school.name}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 160 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => router.push("/payslips")}>
            <FileText size={15} /> Générer les fiches
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat-icon" style={{ background: "var(--sage-tint)", color: "var(--green-dark)" }}><GraduationCap size={16} /></div>
          <div className="stat-label">Élèves inscrits</div>
          <div className="stat-value">{school.students.length}</div>
          <div className="stat-delta">{report ? `${report.studentsUnpaid} non payés` : ""}</div>
        </div>
        <div className="card stat">
          <div className="stat-icon" style={{ background: "var(--green-tint)", color: "var(--green-dark)" }}><TrendingUp size={16} /></div>
          <div className="stat-label">Encaissé — {period}</div>
          <div className="stat-value mono">{money(report?.totalIncome || 0)}</div>
        </div>
        <div className="card stat">
          <div className="stat-icon" style={{ background: "var(--gold-tint)", color: "#8A6420" }}><Wallet size={16} /></div>
          <div className="stat-label">Sorties — {period}</div>
          <div className="stat-value mono">{money(report?.totalOutflow || 0)}</div>
          <div className="stat-delta">Salaires + dépenses</div>
        </div>
        <div className="card stat">
          <div className="stat-icon" style={{ background: (report?.netBalance || 0) >= 0 ? "var(--green-tint)" : "#F7E7DF", color: (report?.netBalance || 0) >= 0 ? "var(--green-dark)" : "var(--red)" }}>
            <Landmark size={16} />
          </div>
          <div className="stat-label">Solde net</div>
          <div className="stat-value mono">{money(report?.netBalance || 0)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 14 }}>Personnel</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "var(--muted)" }}>Employés actifs</span><span className="mono">{totalEmployees}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "var(--muted)" }}>Masse salariale mensuelle</span><span className="mono">{money(monthlyPayroll)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Fiches en attente — {period}</span><span className="mono">{pending}</span>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 14 }}>Répartition par classe</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from(new Set(school.students.map((s) => s.className))).slice(0, 6).map((c) => {
              const count = school.students.filter((s) => s.className === c).length;
              const pct = school.students.length ? (count / school.students.length) * 100 : 0;
              return (
                <div key={c}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span>{c}</span><span className="mono">{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 4 }}>
                    <div style={{ height: 6, width: `${pct}%`, background: "var(--green)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            {school.students.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Aucun élève enregistré.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- promoter: consolidated overview across every school ---------- */
function PromoterDashboard() {
  const [period, setPeriod] = useState(PERIODS[2]);
  const [reports, setReports] = useState<SchoolReport[]>([]);
  const router = useRouter();

  useEffect(() => { api.getAllReports(period).then(setReports); }, [period]);

  const totals = reports.reduce(
    (acc, r) => ({ income: acc.income + r.totalIncome, outflow: acc.outflow + r.totalOutflow, students: acc.students + r.studentsTotal }),
    { income: 0, outflow: 0, students: 0 }
  );
  const net = totals.income - totals.outflow;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue consolidée des {reports.length} écoles</p>
        </div>
        <select className="select-el" style={{ width: 170 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Élèves (total)</div><div className="stat-value">{totals.students}</div></div>
        <div className="card stat"><div className="stat-label">Encaissé (total)</div><div className="stat-value mono">{money(totals.income)}</div></div>
        <div className="card stat"><div className="stat-label">Solde net (total)</div><div className="stat-value mono" style={{ color: net >= 0 ? undefined : "var(--red)" }}>{money(net)}</div></div>
      </div>

      <div className="dept-grid">
        {reports.map((r) => (
          <div key={r.schoolId} className="card dept-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="avatar" style={{ background: r.color, width: 34, height: 34, borderRadius: 8 }}>{initials(r.schoolName)}</div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.schoolName}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>Élèves</span><span className="mono">{r.studentsTotal}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 10 }}>
              <span style={{ color: "var(--muted)" }}>Solde net</span>
              <span className="mono" style={{ fontWeight: 700, color: r.netBalance >= 0 ? "var(--green-dark)" : "var(--red)" }}>{money(r.netBalance)}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-outline" style={{ marginTop: 18 }} onClick={() => router.push("/reports")}>
        Voir le bilan détaillé <ArrowRight size={14} />
      </button>
    </>
  );
}

/* ---------- finance: read-only payslip snapshot ---------- */
function FinanceDashboard() {
  const { school } = useSchools();
  const [period, setPeriod] = useState(PERIODS[2]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!school) return;
    api.listPayslips(school.id, period).then(setPayslips).catch(() => setPayslips([]));
  }, [school, period]);

  if (!school) return null;

  const sent = payslips.filter((p) => p.status === "sent").length;
  const draft = payslips.length - sent;
  const total = payslips.reduce((s, p) => s + p.net, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">{school.name} · consultation des fiches de paie</p>
        </div>
        <select className="select-el" style={{ width: 160 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Fiches générées</div><div className="stat-value">{payslips.length}</div></div>
        <div className="card stat"><div className="stat-label">Envoyées / Brouillon</div><div className="stat-value">{sent} / {draft}</div></div>
        <div className="card stat"><div className="stat-label">Net total — {period}</div><div className="stat-value mono">{money(total)}</div></div>
      </div>

      <button className="btn btn-primary" onClick={() => router.push("/payslips")}>
        Voir et imprimer les fiches <ArrowRight size={14} />
      </button>
    </>
  );
}

/* ---------- treasury (Bonté Service): network-wide income vs. requests/outflow, decides on purchase orders ---------- */
function TreasuryDashboard() {
  const [period, setPeriod] = useState(PERIODS[2]);
  const [reports, setReports] = useState<SchoolReport[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const router = useRouter();

  useEffect(() => {
    api.getAllReports(period).then(setReports);
    api.listAllPurchaseOrders().then(setOrders);
  }, [period]);

  const totals = reports.reduce(
    (acc, r) => ({ income: acc.income + r.totalIncome, outflow: acc.outflow + r.totalOutflow }),
    { income: 0, outflow: 0 }
  );
  const pending = orders.filter((o) => o.status === "pending");
  const validated = orders.filter((o) => o.status === "validated");
  const totalAwaiting = [...pending, ...validated].reduce((s, o) => s + o.amountRequested, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Bonté Service · vue réseau des entrées et sorties</p>
        </div>
        <select className="select-el" style={{ width: 170 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="card stat"><div className="stat-label">Encaissé (réseau)</div><div className="stat-value mono">{money(totals.income)}</div></div>
        <div className="card stat"><div className="stat-label">Sorties (réseau)</div><div className="stat-value mono">{money(totals.outflow)}</div></div>
        <div className="card stat"><div className="stat-label">Demandes à traiter</div><div className="stat-value">{pending.length + validated.length}</div></div>
        <div className="card stat"><div className="stat-label">Montant en attente</div><div className="stat-value mono">{money(totalAwaiting)}</div></div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Demandes en attente</div>
          <button className="btn btn-outline btn-sm" onClick={() => router.push("/purchase-orders")}>
            <ClipboardList size={13} /> Voir toutes les demandes
          </button>
        </div>
        <table className="tbl">
          <thead><tr><th>École</th><th>Libellé</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {[...pending, ...validated].slice(0, 6).map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600 }}>{o.schoolName}</td>
                <td>{o.label}</td>
                <td className="mono">{money(o.amountRequested)}</td>
                <td><span className={"pill " + PURCHASE_ORDER_STATUS_PILL[o.status]}>{PURCHASE_ORDER_STATUS_LABELS[o.status]}</span></td>
              </tr>
            ))}
            {pending.length + validated.length === 0 && <tr><td colSpan={4} className="empty">Aucune demande en attente.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
