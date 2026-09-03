"use client";

import React, { Fragment, useEffect, useState } from "react";
import {
  Landmark, FileText, GraduationCap, Wallet, TrendingUp, ArrowRight, ClipboardList,
  Printer, ChevronDown, ChevronRight, PackageSearch, Truck, Receipt, TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import {
  PURCHASE_ORDER_STATUS_LABELS, PURCHASE_ORDER_STATUS_PILL, EXPENSE_CATEGORY_LABELS, INVENTORY_CATEGORY_LABELS,
} from "@/lib/constants";
import type {
  Payslip, SchoolReport, PurchaseOrder, NetworkInventoryOverview, NetworkInventorySchoolSummary,
  NetworkInventoryStockRow,
} from "@/lib/types";

function formatWhen(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

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
  const [outflows, setOutflows] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<NetworkInventoryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAllReports(period),
      api.listAllPurchaseOrders(),
      api.getNetworkInventoryOverview(period),
    ])
      .then(([r, o, inv]) => {
        setReports(r);
        setOutflows(o.filter((po) => po.status === "validated" || po.status === "executed").sort((a, b) => (b.decidedAt || b.requestedAt) - (a.decidedAt || a.requestedAt)));
        setInventory(inv);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const totals = reports.reduce(
    (acc, r) => ({
      students: acc.students + r.studentsTotal,
      income: acc.income + r.totalIncome,
      outstanding: acc.outstanding + r.totalOutstanding,
      salaries: acc.salaries + r.totalSalariesSent + r.totalSalariesDraft,
      expenses: acc.expenses + r.totalExpenses,
      net: acc.net + r.netBalance,
    }),
    { students: 0, income: 0, outstanding: 0, salaries: 0, expenses: 0, net: 0 }
  );

  const supplyTotals = (inventory?.summaries || []).reduce(
    (acc, s) => ({
      delivered: acc.delivered + s.unitsDelivered,
      sold: acc.sold + s.unitsSold,
      onHand: acc.onHand + s.unitsOnHand,
      revenue: acc.revenue + s.revenue,
      variances: acc.variances + s.varianceCount,
    }),
    { delivered: 0, sold: 0, onHand: 0, revenue: 0, variances: 0 }
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue consolidée des {reports.length} écoles — {period}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 170 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-outline" onClick={() => window.print()}>
            <Printer size={14} /> Imprimer
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Élèves (total)</div><div className="stat-value">{totals.students}</div></div>
        <div className="card stat"><div className="stat-label">Encaissé (total)</div><div className="stat-value mono">{money(totals.income)}</div></div>
        <div className="card stat"><div className="stat-label">Impayé (total)</div><div className="stat-value mono" style={{ color: "var(--red)" }}>{money(totals.outstanding)}</div></div>
        <div className="card stat"><div className="stat-label">Salaires (total)</div><div className="stat-value mono">{money(totals.salaries)}</div></div>
        <div className="card stat"><div className="stat-label">Dépenses (total)</div><div className="stat-value mono">{money(totals.expenses)}</div></div>
        <div className="card stat"><div className="stat-label">Solde net (total)</div><div className="stat-value mono" style={{ color: totals.net >= 0 ? "var(--green-dark)" : "var(--red)" }}>{money(totals.net)}</div></div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 22, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>École</th><th>Élèves</th><th>Encaissé</th><th>Impayé</th><th>Salaires</th><th>Dépenses</th><th>Solde net</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.schoolId}>
                  <td style={{ fontWeight: 700 }}>{r.schoolName}</td>
                  <td className="mono" style={{ color: "var(--muted)" }}>{r.studentsTotal}</td>
                  <td className="mono" style={{ color: "var(--green-dark)" }}>{money(r.totalIncome)}</td>
                  <td className="mono" style={{ color: "var(--red)" }}>{money(r.totalOutstanding)}</td>
                  <td className="mono" style={{ color: "var(--muted)" }}>{money(r.totalSalariesSent + r.totalSalariesDraft)}</td>
                  <td className="mono" style={{ color: "var(--muted)" }}>{money(r.totalExpenses)}</td>
                  <td className="mono" style={{ fontWeight: 700, color: r.netBalance >= 0 ? "var(--green-dark)" : "var(--red)" }}>{money(r.netBalance)}</td>
                </tr>
              ))}
              {!loading && reports.length === 0 && <tr><td colSpan={7} className="empty">Aucune école à afficher.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Sorties de trésorerie</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
          Bons de commande validés ou exécutés par Bonté Service — l&apos;argent qui est réellement sorti du réseau.
        </div>
        {outflows.length === 0 ? (
          <div className="card empty">Aucune sortie enregistrée pour cette période.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr><th>École</th><th>Catégorie</th><th>Libellé</th><th>Montant</th><th>Statut</th><th>Quand</th></tr>
                </thead>
                <tbody>
                  {outflows.slice(0, 10).map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.schoolName}</td>
                      <td style={{ color: "var(--muted)" }}>{EXPENSE_CATEGORY_LABELS[o.category]}</td>
                      <td>{o.label}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{money(o.executedAmount ?? o.amountRequested)}</td>
                      <td><span className={"pill " + PURCHASE_ORDER_STATUS_PILL[o.status]}>{PURCHASE_ORDER_STATUS_LABELS[o.status]}</span></td>
                      <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{formatWhen(o.executedAt || o.decidedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => router.push("/purchase-orders")}>
          <ClipboardList size={13} /> Voir tous les bons de commande
        </button>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <PackageSearch size={18} color="var(--muted)" />
          <div style={{ fontWeight: 700, fontSize: 16 }}>Intendance &amp; logistique</div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
          Stock d&apos;uniformes, chaussures et fournitures réseau — livraisons, ventes, et écarts constatés lors des comptages.
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
          <div className="card stat"><div className="stat-label">Unités livrées</div><div className="stat-value">{supplyTotals.delivered}</div></div>
          <div className="card stat"><div className="stat-label">Unités vendues</div><div className="stat-value">{supplyTotals.sold}</div></div>
          <div className="card stat"><div className="stat-label">Stock disponible</div><div className="stat-value">{supplyTotals.onHand}</div></div>
          <div className="card stat"><div className="stat-label">Chiffre d&apos;affaires</div><div className="stat-value mono">{money(supplyTotals.revenue)}</div></div>
          <div
            className="card stat"
            style={supplyTotals.variances > 0 ? { borderColor: "var(--red)", background: "var(--red-tint)" } : undefined}
          >
            <div className="stat-label">Écarts signalés</div>
            <div className="stat-value">{supplyTotals.variances}</div>
          </div>
        </div>

        <SupplyStockByClient
          summaries={inventory?.summaries || []}
          stockByClient={inventory?.stockByClient || {}}
        />

        {(inventory?.variances.length || 0) > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <TriangleAlert size={16} color="var(--red)" />
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Écarts d&apos;inventaire</div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
              Ajustements enregistrés après un comptage physique — chaque écart mérite une vérification.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inventory!.variances.map((v) => (
                <div key={v.id} className="card" style={{ padding: 14, borderColor: "var(--red-tint)", background: "var(--red-tint)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{v.schoolName} — {v.itemLabel}</span>
                    <span className="pill pill-draft" style={{ background: "#F2D9CB", color: "var(--red)" }}>
                      {v.quantity > 0 ? "+" : ""}{v.quantity}
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>
                    {formatDate(v.date)} · par {v.recordedBy || "—"}{v.note ? ` — « ${v.note} »` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Truck size={15} color="var(--muted)" />
              <div style={{ fontWeight: 700, fontSize: 14 }}>Dernières livraisons</div>
            </div>
            {(inventory?.recentDeliveries.length || 0) === 0 ? (
              <div className="card empty">Aucune livraison pour l&apos;instant.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inventory!.recentDeliveries.map((d) => (
                  <div key={d.id} className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{d.schoolName} — {d.quantity}× {d.itemLabel}</span>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{formatWhen(d.recordedAt)}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
                      {INVENTORY_CATEGORY_LABELS[d.category]} · reçu le {formatDate(d.date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Receipt size={15} color="var(--muted)" />
              <div style={{ fontWeight: 700, fontSize: 14 }}>Dernières ventes</div>
            </div>
            {(inventory?.recentSales.length || 0) === 0 ? (
              <div className="card empty">Aucune vente pour l&apos;instant.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inventory!.recentSales.map((s) => (
                  <div key={s.id} className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{s.schoolName} — {s.quantity}× {s.itemLabel}</span>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{money(s.amount || 0)}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
                      vendu le {formatDate(s.date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="btn btn-outline" style={{ marginTop: 22 }} onClick={() => router.push("/reports")}>
        Voir le bilan détaillé <ArrowRight size={14} />
      </button>
    </>
  );
}

/* Expandable per-school stock table (items delivered/sold/on hand per school), promoter-only. */
function SupplyStockByClient({
  summaries,
  stockByClient,
}: {
  summaries: NetworkInventorySchoolSummary[];
  stockByClient: Record<string, NetworkInventoryStockRow[]>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(schoolId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  }

  if (summaries.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>École</th><th>Livré</th><th>Vendu</th><th>Disponible</th><th>Revenu</th><th>Écarts</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const isOpen = expanded.has(s.schoolId);
              const rows = stockByClient[s.schoolId] ?? [];
              return (
                <Fragment key={s.schoolId}>
                  <tr style={{ cursor: "pointer" }} onClick={() => toggle(s.schoolId)}>
                    <td style={{ fontWeight: 700 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {isOpen ? <ChevronDown size={14} color="var(--muted)" /> : <ChevronRight size={14} color="var(--muted)" />}
                        {s.schoolName}
                      </span>
                    </td>
                    <td className="mono" style={{ color: "var(--muted)" }}>{s.unitsDelivered}</td>
                    <td className="mono" style={{ color: "var(--muted)" }}>{s.unitsSold}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{s.unitsOnHand}</td>
                    <td className="mono" style={{ color: "var(--muted)" }}>{money(s.revenue)}</td>
                    <td>
                      {s.varianceCount > 0 ? (
                        <span className="pill" style={{ background: "var(--red-tint)", color: "var(--red)" }}>{s.varianceCount}</span>
                      ) : (
                        <span className="pill pill-sent">Aucun</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--cream)", padding: "12px 16px" }}>
                        {rows.length === 0 ? (
                          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                            Aucun article suivi pour {s.schoolName}.
                          </p>
                        ) : (
                          <table className="tbl" style={{ fontSize: 12.5 }}>
                            <thead>
                              <tr><th>Article</th><th>Catégorie</th><th>Livré</th><th>Vendu</th><th>Disponible</th></tr>
                            </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={`${s.schoolId}::${r.category}::${r.itemLabel}`}>
                                  <td>{r.itemLabel}</td>
                                  <td style={{ color: "var(--muted)" }}>{INVENTORY_CATEGORY_LABELS[r.category]}</td>
                                  <td className="mono">{r.delivered}</td>
                                  <td className="mono">{r.sold}</td>
                                  <td className="mono" style={{ fontWeight: 700 }}>{r.stock}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
