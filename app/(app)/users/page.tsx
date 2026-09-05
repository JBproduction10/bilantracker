"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, X, Mail, Send } from "lucide-react";
import { api } from "@/lib/apiClient";
import { useSchools } from "@/context/SchoolContext";
import { usePromoterWorkspace } from "@/context/PromoterContext";
import { initials } from "@/lib/utils";
import { ROLE_LABELS, ROLES, USER_STATUS_LABELS } from "@/lib/constants";
import { isValidEmail } from "@/lib/validation";
import type { AppUser, Role, School } from "@/lib/types";

type SafeUser = Omit<AppUser, "passwordHash" | "inviteToken">;

export default function UsersPage() {
  const { schools } = useSchools();
  const { activePromoter, activePromoterId } = usePromoterWorkspace();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setUsers(await api.listUsers());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // "Comptes" is scoped to the current promoter's workspace, same as
  // everything else: this promoter's own promoter/treasury account(s), plus
  // every account belonging to one of its schools. Other tenants' accounts
  // (and any other super_admin) simply don't show up here.
  const schoolIds = new Set(schools.map((s) => s.id));
  const visibleUsers = users.filter((u) => (u.schoolId && schoolIds.has(u.schoolId)) || (u.promoterId && u.promoterId === activePromoterId));

  function schoolName(id?: string) {
    return schools.find((s) => s.id === id)?.name || "—";
  }

  async function remove(id: string) {
    await api.removeUser(id);
    await load();
  }

  async function resend(id: string) {
    setBusyId(id);
    try {
      const res = await api.resendInvite(id);
      setNotice(res.simulated ? "Invitation renvoyée (simulée — configurez le SMTP pour un envoi réel)." : "Invitation renvoyée.");
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Comptes</h1>
          <p className="page-subtitle">{visibleUsers.length} comptes dans l&apos;espace {activePromoter?.name || ""}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Inviter un compte</button>
      </div>

      {notice && <div className="card banner" style={{ borderColor: "var(--green)", background: "var(--green-tint)" }}><span style={{ fontSize: 13, color: "var(--green-dark)" }}>{notice}</span></div>}

      <div className="card banner">
        <div className="banner-icon"><Mail size={16} /></div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Il n&apos;y a pas d&apos;inscription libre. Seul le super admin crée un compte, avec un nom, un email et un rôle —
          la personne reçoit un lien par email pour choisir elle-même son mot de passe avant de pouvoir se connecter.
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>École</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ background: "#1F6E4D" }}>{initials(u.name)}</div>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                  </div>
                </td>
                <td style={{ color: "var(--muted)" }}>{u.email}</td>
                <td><span className="pill pill-active">{ROLE_LABELS[u.role]}</span></td>
                <td>{u.schoolId ? schoolName(u.schoolId) : u.promoterId ? activePromoter?.name || "—" : "Toutes"}</td>
                <td><span className={"pill " + (u.status === "active" ? "pill-sent" : "pill-draft")}>{USER_STATUS_LABELS[u.status]}</span></td>
                <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {u.status === "pending" && (
                    <button className="btn btn-outline btn-sm" disabled={busyId === u.id} onClick={() => resend(u.id)}>
                      <Send size={13} /> Renvoyer
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(u.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!loading && visibleUsers.length === 0 && <tr><td colSpan={6} className="empty">Aucun compte dans cet espace.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddUserModal
          schools={schools}
          promoterId={activePromoterId || undefined}
          onClose={() => setShowAdd(false)}
          onAdded={async (simulated) => {
            await load();
            setShowAdd(false);
            setNotice(simulated ? "Compte créé. Invitation envoyée (simulée — configurez le SMTP pour un envoi réel)." : "Compte créé. Invitation envoyée par email.");
            setTimeout(() => setNotice(null), 5000);
          }}
        />
      )}
    </>
  );
}

function AddUserModal({
  schools, promoterId, onClose, onAdded,
}: { schools: School[]; promoterId?: string; onClose: () => void; onAdded: (simulated: boolean) => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("school_admin");
  const [schoolId, setSchoolId] = useState(schools[0]?.id || "");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const needsSchool = role === "school_admin" || role === "finance" || role === "teacher" || role === "logistics" || role === "cashier";
  const needsPromoter = role === "promoter" || role === "treasury";
  const selectedSchool = schools.find((s) => s.id === schoolId);

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError("Renseignez le nom et l'email.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Cette adresse email n'est pas valide.");
      return;
    }
    if (needsSchool && !schoolId) {
      setError("Créez d'abord une école dans cet espace.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await api.createUser({
        name: name.trim(), email: email.trim(), role,
        ...(needsSchool ? { schoolId } : {}),
        ...(needsPromoter ? { promoterId } : {}),
        ...(role === "teacher" && employeeId ? { employeeId } : {}),
      });
      onAdded(created._invite.simulated);
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
            <p className="modal-title">Inviter un compte</p>
            <p className="modal-sub">Un email sera envoyé pour que la personne choisisse elle-même son mot de passe.</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom complet</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Jean Mballa" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label">Email</label>
          <input className="field" style={{ marginBottom: 14 }} type="email" placeholder="nom@ecole.cm" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="label">Rôle</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          {needsSchool && (
            <>
              <label className="label">École</label>
              {schools.length > 0 ? (
                <select className="select-el" style={{ marginBottom: 14 }} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <div className="error-text" style={{ marginBottom: 14 }}>Créez d&apos;abord une école dans cet espace.</div>
              )}
            </>
          )}
          {needsPromoter && (
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>
              Ce compte sera rattaché à ce promoteur — il ne verra que les écoles de cet espace, jamais celles d&apos;un autre.
            </div>
          )}
          {role === "teacher" && selectedSchool && (
            <>
              <label className="label">Lier à un employé (facultatif)</label>
              <select className="select-el" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Aucun</option>
                {selectedSchool.employees.filter((e) => !e.deletedAt).map((e) => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
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
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Envoi…" : "Créer et inviter"}</button>
        </div>
      </div>
    </div>
  );
}
