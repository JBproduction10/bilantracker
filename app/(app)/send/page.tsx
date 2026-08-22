"use client";

import React, { useEffect, useState } from "react";
import { Send, Mail, X } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials, PERIODS } from "@/lib/utils";
import type { Employee, Payslip } from "@/lib/types";

interface ConfirmTarget {
  p: Payslip;
  emp: Employee;
}

export default function SendPayslips() {
  const { school } = useSchools();
  const [period, setPeriod] = useState("August 2026");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    const result = await api.sendPayslip(school!.id, payslip.id);
    setConfirmTarget(null);
    setNotice(result.simulated ? "Sent (simulated — connect SMTP settings to deliver real email)." : "Payslip emailed.");
    await load();
    setTimeout(() => setNotice(null), 4000);
  }
  async function sendAll() {
    const result = await api.sendAllDrafts(school!.id, period);
    setNotice(result.simulated ? `Sent ${result.sent} payslips (simulated — connect SMTP settings to deliver real email).` : `Sent ${result.sent} payslips.`);
    await load();
    setTimeout(() => setNotice(null), 4000);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Send Payslips</h1>
          <p className="page-subtitle">Deliver {period} payslips to your team.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select-el" style={{ width: 150 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary" disabled={drafts.length === 0} onClick={sendAll}>
            <Send size={14} /> Send All Drafts {drafts.length > 0 && drafts.length}
          </button>
        </div>
      </div>

      {notice && <div className="card banner" style={{ borderColor: "var(--green)", background: "var(--green-tint)" }}><span style={{ fontSize: 13, color: "var(--green-dark)" }}>{notice}</span></div>}

      <div className="card banner">
        <div className="banner-icon"><Mail size={16} /></div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Emails send through the server's mail settings. Without SMTP credentials configured, sends are simulated (logged, not actually delivered) so you can try the whole flow safely.
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Ready to send</div><div className="stat-value">{drafts.length}</div></div>
        <div className="card stat"><div className="stat-label">Net payable pending</div><div className="stat-value mono">{money(netPending)}</div></div>
        <div className="card stat"><div className="stat-label">Delivered</div><div className="stat-value">{delivered.length}</div></div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Ready to send</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <table className="tbl">
          <thead><tr><th>Employee</th><th>Department</th><th>Net Pay</th><th>Email</th><th></th></tr></thead>
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
                    <button className="btn btn-primary btn-sm" onClick={() => setConfirmTarget({ p, emp })}><Send size={13} /> Send</button>
                  </td>
                </tr>
              );
            })}
            {drafts.length === 0 && <tr><td colSpan={5} className="empty">Everyone's payslip for {period} has been sent.</td></tr>}
          </tbody>
        </table>
      </div>

      {delivered.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Delivered</div>
          <div className="dept-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {delivered.map((p) => {
              const emp = school.employees.find((e) => e.id === p.employeeId);
              if (!emp) return null;
              return (
                <div key={p.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar" style={{ background: school.color }}>{initials(emp.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{emp.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--green-dark)" }}>Delivered</div>
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
              <p className="modal-title">Confirm send</p>
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
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Net pay</div>
                  <div className="mono" style={{ fontWeight: 700 }}>{money(confirmTarget.p.net)}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Send the {period} payslip to <strong style={{ color: "var(--ink)" }}>{confirmTarget.emp.email}</strong>? This will mark it as delivered.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => send(confirmTarget!.p)}><Send size={14} /> Confirm Send</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
