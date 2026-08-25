"use client";

import React, { useState } from "react";
import { Building2, Plus, X, Trash2, Pencil } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials } from "@/lib/utils";
import type { School, Department } from "@/lib/types";

export default function Departments() {
  const { school, refresh } = useSchools();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
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
          <h1 className="page-title">Départements</h1>
          <p className="page-subtitle">{school.departments.length} départements · {school.employees.length} employés</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Ajouter un département</button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Effectif total</div><div className="stat-value">{school.employees.length}</div></div>
        <div className="card stat"><div className="stat-label">Masse salariale mensuelle</div><div className="stat-value mono">{money(totalPayroll)}</div></div>
        <div className="card stat"><div className="stat-label">Départements</div><div className="stat-value">{school.departments.length}</div></div>
      </div>

      <div className="dept-grid">
        {school.departments.map((d) => {
          const members = school.employees.filter((e) => e.department === d.name);
          const payroll = members.reduce((s, e) => s + e.baseSalary, 0);
          return (
            <div key={d.id} className="card dept-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="dept-icon"><Building2 size={18} /></div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(d)}><Pencil size={13} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeDept(d.id)}><Trash2 size={13} /></button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 4 }}>{d.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{d.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <div><div style={{ color: "var(--muted)" }}>Responsable</div><div style={{ fontWeight: 700 }}>{d.head || "—"}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ color: "var(--muted)" }}>Masse salariale mensuelle</div><div className="mono" style={{ fontWeight: 700 }}>{money(payroll)}</div></div>
              </div>
              <div style={{ display: "flex" }}>
                {members.slice(0, 6).map((m) => (
                  <div key={m.id} className="avatar" style={{ background: school.color, marginLeft: -6, border: "2px solid var(--paper)" }}>{initials(m.name)}</div>
                ))}
                {members.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Aucun employé pour l&apos;instant</div>}
              </div>
            </div>
          );
        })}
        {school.departments.length === 0 && <div className="empty">Aucun département pour l&apos;instant. Ajoutez-en un pour commencer.</div>}
      </div>

      {showAdd && (
        <DepartmentModal school={school} onClose={() => setShowAdd(false)} onSaved={async () => { await refresh(); setShowAdd(false); }} />
      )}
      {editTarget && (
        <DepartmentModal school={school} department={editTarget} onClose={() => setEditTarget(null)} onSaved={async () => { await refresh(); setEditTarget(null); }} />
      )}
    </>
  );
}

interface DepartmentModalProps {
  school: School;
  department?: Department;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function DepartmentModal({ school, department, onClose, onSaved }: DepartmentModalProps) {
  const [name, setName] = useState(department?.name || "");
  const [head, setHead] = useState(department?.head || "");
  const [description, setDescription] = useState(department?.description || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return setError("Donnez un nom au département.");
    setBusy(true);
    setError("");
    try {
      const body = { name: name.trim(), head: head.trim(), description: description.trim() };
      if (department) await api.updateDepartment(school.id, department.id, body);
      else await api.addDepartment(school.id, body);
      onSaved();
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
          <p className="modal-title">{department ? "Modifier le département" : "Ajouter un département"}</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Enseignants" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label">Responsable de département</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Marceline Fotso" value={head} onChange={(e) => setHead(e.target.value)} />
          <label className="label">Description</label>
          <input className="field" placeholder="Le rôle de cette équipe" value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : department ? "Enregistrer" : "Ajouter le département"}</button>
        </div>
      </div>
    </div>
  );
}
