"use client";

import React, { useState } from "react";
import { Plus, Search, Trash2, Pencil, X, Upload, Trash } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials } from "@/lib/utils";
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUSES } from "@/lib/constants";
import { ImportEmployeesDialog } from "@/components/ImportEmployeesDialog";
import type { School, Employee, EmployeeStatus } from "@/lib/types";

export default function Employees() {
  const { school, refresh } = useSchools();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!school) return null;

  // Soft-deleted employees stay in the school document (so past payslips
  // still resolve their name) but never appear in the active roster —
  // they live in the Trash dialog instead.
  const activeEmployees = school.employees.filter((e) => !e.deletedAt);

  const filtered = activeEmployees.filter((e) => {
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
          <h1 className="page-title">Employés</h1>
          <p className="page-subtitle">{activeEmployees.length} employés répartis sur {school.departments.length} départements</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={() => setShowTrash(true)}><Trash size={15} /> Corbeille</button>
          <button className="btn btn-outline" onClick={() => setShowImport(true)}><Upload size={15} /> Importer</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Ajouter un employé</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="search-box" style={{ flex: 1, width: "auto" }}>
          <Search size={14} />
          <input
            style={{ border: "none", background: "none", outline: "none", width: "100%", fontSize: 13, color: "var(--ink)" }}
            placeholder="Rechercher par nom, email, poste…" value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select-el" style={{ width: 200 }} value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="All">Tous les départements</option>
          {school.departments.map((d) => <option key={d.id}>{d.name}</option>)}
        </select>
        <select className="select-el" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">Tous les statuts</option>
          {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Employé</th><th>Département</th><th>Email</th><th>Salaire de base</th><th>Statut</th><th></th></tr></thead>
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
                    {EMPLOYEE_STATUS_LABELS[e.status]}
                  </span>
                </td>
                <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(e)}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-sm" title="Mettre à la corbeille" disabled={busyId === e.id} onClick={() => removeEmployee(e.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="empty">Aucun employé ne correspond à ces filtres.</td></tr>}
          </tbody>
        </table>
      </div>

      {showTrash && (
        <TrashEmployeesDialog school={school} onClose={() => setShowTrash(false)} onChanged={async () => { await refresh(); }} />
      )}
      {showImport && (
        <ImportEmployeesDialog schoolId={school.id} departments={school.departments} onClose={() => setShowImport(false)} onImported={async () => { await refresh(); }} />
      )}
      {showAdd && (
        <EmployeeModal school={school} onClose={() => setShowAdd(false)} onSaved={async () => { await refresh(); setShowAdd(false); }} />
      )}
      {editTarget && (
        <EmployeeModal school={school} employee={editTarget} onClose={() => setEditTarget(null)} onSaved={async () => { await refresh(); setEditTarget(null); }} />
      )}
    </>
  );
}

/** Trash: employees soft-deleted from the roster, recoverable until permanently removed. */
function TrashEmployeesDialog({
  school, onClose, onChanged,
}: { school: School; onClose: () => void; onChanged: () => void | Promise<void> }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const items = school.employees.filter((e) => !!e.deletedAt).sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));

  async function restore(id: string) {
    setBusyId(id);
    try {
      await api.restoreEmployee(school.id, id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function destroy(id: string) {
    setBusyId(id);
    try {
      await api.permanentlyDeleteEmployee(school.id, id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">Corbeille — employés</p>
            <p className="modal-sub">Un employé retiré reste récupérable ici, et ses fiches de paie déjà générées restent intactes. La suppression définitive ne peut pas être annulée.</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {items.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>La corbeille est vide.</div>}
          {items.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.position} · supprimé le {e.deletedAt?.slice(0, 10)}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="btn btn-outline btn-sm" disabled={busyId === e.id} onClick={() => restore(e.id)}>Restaurer</button>
                <button className="btn btn-ghost btn-sm" title="Supprimer définitivement" disabled={busyId === e.id} onClick={() => destroy(e.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

interface EmployeeModalProps {
  school: School;
  employee?: Employee;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function EmployeeModal({ school, employee, onClose, onSaved }: EmployeeModalProps) {
  const [name, setName] = useState(employee?.name || "");
  const [position, setPosition] = useState(employee?.position || "");
  const [department, setDepartment] = useState(employee?.department || school.departments[0]?.name || "");
  const [baseSalary, setBaseSalary] = useState(employee ? String(employee.baseSalary) : "");
  const [status, setStatus] = useState<EmployeeStatus>(employee?.status || "Active");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !position.trim() || !department || !baseSalary) {
      setError("Renseignez le nom, le poste, le département et le salaire de base.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { name: name.trim(), position: position.trim(), department, baseSalary: Number(baseSalary), status };
      if (employee) await api.updateEmployee(school.id, employee.id, body);
      else await api.addEmployee(school.id, body);
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
          <div>
            <p className="modal-title">{employee ? "Modifier l'employé" : "Ajouter un employé"}</p>
            <p className="modal-sub">{employee ? `Mettre à jour les informations pour ${school.name}.` : `Renseignez les informations de paie pour l'ajouter à ${school.name}.`}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom complet</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Jean Mballa" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="field-row">
            <div>
              <label className="label">Poste</label>
              <input className="field" placeholder="ex. Enseignant" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div>
              <label className="label">Département</label>
              <select className="select-el" value={department} onChange={(e) => setDepartment(e.target.value)}>
                {school.departments.map((d) => <option key={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="label">Salaire de base (FC)</label>
              <input className="field" type="number" placeholder="120000" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="select-el" value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)}>
                {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : employee ? "Enregistrer" : "Ajouter l'employé"}</button>
        </div>
      </div>
    </div>
  );
}
