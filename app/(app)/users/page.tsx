"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { initials } from "@/lib/utils";
import { ROLE_LABELS, ROLES } from "@/lib/constants";
import type { AppUser, Role, School } from "@/lib/types";

type SafeUser = Omit<AppUser, "passwordHash">;

export default function UsersPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [u, s] = await Promise.all([api.listUsers(), api.listSchools()]);
    setUsers(u);
    setSchools(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  function schoolName(id?: string) {
    return schools.find((s) => s.id === id)?.name || "—";
  }

  async function remove(id: string) {
    await api.removeUser(id);
    await load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Comptes</h1>
          <p className="page-subtitle">{users.length} comptes sur l&apos;ensemble du site</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Créer un compte</button>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>École</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ background: "#1F6E4D" }}>{initials(u.name)}</div>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                  </div>
                </td>
                <td style={{ color: "var(--muted)" }}>{u.email}</td>
                <td><span className="pill pill-active">{ROLE_LABELS[u.role]}</span></td>
                <td>{u.schoolId ? schoolName(u.schoolId) : "Toutes"}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(u.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && <tr><td colSpan={5} className="empty">Aucun compte.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddUserModal schools={schools} onClose={() => setShowAdd(false)} onAdded={async () => { await load(); setShowAdd(false); }} />
      )}
    </>
  );
}

function AddUserModal({
  schools, onClose, onAdded,
}: { schools: School[]; onClose: () => void; onAdded: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("school_admin");
  const [schoolId, setSchoolId] = useState(schools[0]?.id || "");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const needsSchool = role === "school_admin" || role === "finance" || role === "teacher";
  const selectedSchool = schools.find((s) => s.id === schoolId);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError("Renseignez le nom, l'email et le mot de passe.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.createUser({
        name: name.trim(), email: email.trim(), password, role,
        ...(needsSchool ? { schoolId } : {}),
        ...(role === "teacher" && employeeId ? { employeeId } : {}),
      });
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
          <p className="modal-title">Créer un compte</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom complet</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Jean Mballa" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="field-row">
            <div>
              <label className="label">Email</label>
              <input className="field" type="email" placeholder="nom@ecole.cm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input className="field" type="text" placeholder="min. 6 caractères" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <label className="label">Rôle</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          {needsSchool && (
            <>
              <label className="label">École</label>
              <select className="select-el" style={{ marginBottom: 14 }} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}
          {role === "teacher" && selectedSchool && (
            <>
              <label className="label">Lier à un employé (facultatif)</label>
              <select className="select-el" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Aucun</option>
                {selectedSchool.employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                Sans lien, cet enseignant ne verra encore aucune fiche de paie.
              </div>
            </>
          )}
          {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Création…" : "Créer le compte"}</button>
        </div>
      </div>
    </div>
  );
}
