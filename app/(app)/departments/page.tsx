"use client";

import React, { useState } from "react";
import { Building2, Plus, X, Trash2 } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials } from "@/lib/utils";
import type { School } from "@/lib/types";

export default function Departments() {
  const { school, refresh } = useSchools();
  const [showAdd, setShowAdd] = useState(false);
  if (!school) return null;

  async function removeDept(id: string) {
    await api.removeDepartment(school!.id, id);
    await refresh();
  }

  const totalPayroll = school.employees.reduce((s, e) => s + e.baseSalary, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">{school.departments.length} departments · {school.employees.length} employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Department</button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Total headcount</div><div className="stat-value">{school.employees.length}</div></div>
        <div className="card stat"><div className="stat-label">Monthly payroll</div><div className="stat-value mono">{money(totalPayroll)}</div></div>
        <div className="card stat"><div className="stat-label">Departments</div><div className="stat-value">{school.departments.length}</div></div>
      </div>

      <div className="dept-grid">
        {school.departments.map((d) => {
          const members = school.employees.filter((e) => e.department === d.name);
          const payroll = members.reduce((s, e) => s + e.baseSalary, 0);
          return (
            <div key={d.id} className="card dept-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="dept-icon"><Building2 size={18} /></div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeDept(d.id)}><Trash2 size={13} /></button>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 4 }}>{d.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{d.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <div><div style={{ color: "var(--muted)" }}>Head</div><div style={{ fontWeight: 700 }}>{d.head || "—"}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ color: "var(--muted)" }}>Monthly payroll</div><div className="mono" style={{ fontWeight: 700 }}>{money(payroll)}</div></div>
              </div>
              <div style={{ display: "flex" }}>
                {members.slice(0, 6).map((m) => (
                  <div key={m.id} className="avatar" style={{ background: school.color, marginLeft: -6, border: "2px solid var(--paper)" }}>{initials(m.name)}</div>
                ))}
                {members.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>No employees yet</div>}
              </div>
            </div>
          );
        })}
        {school.departments.length === 0 && <div className="empty">No departments yet. Add one to get started.</div>}
      </div>

      {showAdd && (
        <AddDepartmentModal school={school} onClose={() => setShowAdd(false)} onAdded={async () => { await refresh(); setShowAdd(false); }} />
      )}
    </>
  );
}

interface AddDepartmentModalProps {
  school: School;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}

function AddDepartmentModal({ school, onClose, onAdded }: AddDepartmentModalProps) {
  const [name, setName] = useState("");
  const [head, setHead] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return setError("Give the department a name.");
    setBusy(true);
    try {
      await api.addDepartment(school.id, { name: name.trim(), head: head.trim(), description: description.trim() });
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
          <p className="modal-title">Add Department</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Name</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="e.g. Product" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label">Head of department</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="e.g. Jordan Lee" value={head} onChange={(e) => setHead(e.target.value)} />
          <label className="label">Description</label>
          <input className="field" placeholder="What this team does" value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Adding…" : "Add Department"}</button>
        </div>
      </div>
    </div>
  );
}
