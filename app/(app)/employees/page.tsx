"use client";

import React, { useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials } from "@/lib/utils";
import type { School, EmployeeStatus } from "@/lib/types";

export default function Employees() {
  const { school, refresh } = useSchools();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!school) return null;

  const filtered = school.employees.filter((e) => {
    const q = query.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.position.toLowerCase().includes(q);
    const matchD = dept === "All" || e.department === dept;
    const matchS = status === "All" || e.status === status;
    return matchQ && matchD && matchS;
  });

  async function removeEmployee(id: string) {
    setBusyId(id);
    try {
      await api.removeEmployee(school!.id, id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{school.employees.length} employees across {school.departments.length} departments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Employee</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="search-box" style={{ flex: 1, width: "auto" }}>
          <Search size={14} />
          <input
            style={{ border: "none", background: "none", outline: "none", width: "100%", fontSize: 13, color: "var(--ink)" }}
            placeholder="Search name, email, role…" value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select-el" style={{ width: 200 }} value={dept} onChange={(e) => setDept(e.target.value)}>
          <option>All</option>
          {school.departments.map((d) => <option key={d.id}>{d.name}</option>)}
        </select>
        <select className="select-el" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["All", "Active", "On Leave", "Inactive"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Employee</th><th>Department</th><th>Email</th><th>Base Salary</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ background: school.color }}>{initials(e.name)}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.position}</div>
                    </div>
                  </div>
                </td>
                <td>{e.department}</td>
                <td style={{ color: "var(--muted)" }}>{e.email}</td>
                <td className="mono">{money(e.baseSalary)}</td>
                <td>
                  <span className={"pill " + (e.status === "Active" ? "pill-active" : e.status === "On Leave" ? "pill-leave" : "pill-inactive")}>
                    {e.status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-ghost btn-sm" disabled={busyId === e.id} onClick={() => removeEmployee(e.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="empty">No employees match those filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddEmployeeModal
          school={school}
          onClose={() => setShowAdd(false)}
          onAdded={async () => { await refresh(); setShowAdd(false); }}
        />
      )}
    </>
  );
}

interface AddEmployeeModalProps {
  school: School;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}

function AddEmployeeModal({ school, onClose, onAdded }: AddEmployeeModalProps) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState(school.departments[0]?.name || "");
  const [baseSalary, setBaseSalary] = useState("");
  const [status, setStatus] = useState<EmployeeStatus>("Active");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !position.trim() || !department || !baseSalary) {
      setError("Fill in name, position, department, and base salary.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.addEmployee(school.id, { name: name.trim(), position: position.trim(), department, baseSalary: Number(baseSalary), status });
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
          <div>
            <p className="modal-title">Add Employee</p>
            <p className="modal-sub">Enter their pay details to add them to {school.name}.</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Full name</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="e.g. Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="field-row">
            <div>
              <label className="label">Position</label>
              <input className="field" placeholder="e.g. Engineer" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div>
              <label className="label">Department</label>
              <select className="select-el" value={department} onChange={(e) => setDepartment(e.target.value)}>
                {school.departments.map((d) => <option key={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="label">Base salary (USD)</label>
              <input className="field" type="number" placeholder="6000" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select-el" value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)}>
                {["Active", "On Leave", "Inactive"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Adding…" : "Add Employee"}</button>
        </div>
      </div>
    </div>
  );
}
