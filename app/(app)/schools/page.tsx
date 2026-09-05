"use client";

import React, { useState } from "react";
import { Plus, X, Pencil, Trash2, Eye, Check } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { usePromoterWorkspace } from "@/context/PromoterContext";
import { api, type PromoterWithSchools } from "@/lib/apiClient";
import { initials } from "@/lib/utils";
import type { School } from "@/lib/types";

interface ModalState {
  mode: "add" | "edit";
  school?: School;
}

const TAB_COLORS = ["#1F6E4D", "#C99A3B", "#6B8F71", "#5B7FA6", "#9C4A34", "#7A5C46"];

export default function SchoolsPage() {
  const { schools, activeId, setActiveId, refresh } = useSchools();
  const { promoters, activePromoter } = usePromoterWorkspace();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [removeTarget, setRemoveTarget] = useState<School | null>(null);
  const [error, setError] = useState("");

  function promoterName(id: string) {
    return promoters.find((p) => p.id === id)?.name || "—";
  }

  const totalEmployees = schools.reduce((s, c) => s + c.employees.filter((e) => !e.deletedAt).length, 0);
  const totalDepartments = schools.reduce((s, c) => s + c.departments.length, 0);

  async function confirmRemove() {
    try {
      await api.removeSchool(removeTarget!.id);
      await refresh();
      setRemoveTarget(null);
    } catch (err) {
      setError((err as Error).message);
      setRemoveTarget(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Écoles</h1>
          <p className="page-subtitle">Gérez les écoles du réseau et leurs comptes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: "add" })}><Plus size={15} /> Ajouter une école</button>
      </div>

      {error && <div className="error-text" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Écoles</div><div className="stat-value">{schools.length}</div></div>
        <div className="card stat"><div className="stat-label">Employés</div><div className="stat-value">{totalEmployees}</div></div>
        <div className="card stat"><div className="stat-label">Départements</div><div className="stat-value">{totalDepartments}</div></div>
      </div>

      <div className="dept-grid">
        {schools.map((c) => (
          <div key={c.id} className="card dept-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="avatar" style={{ background: c.color, width: 38, height: 38, borderRadius: 9, fontSize: 13 }}>{initials(c.name)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                  {c.name}
                  {c.id === activeId && <span className="pill pill-active">Active</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.description}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#8A6420", marginBottom: 4 }}>@{c.domain}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>Promoteur : {promoterName(c.promoterId)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              <div><div className="mono" style={{ fontWeight: 700 }}>{c.employees.filter((e) => !e.deletedAt).length}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Employés</div></div>
              <div><div className="mono" style={{ fontWeight: 700 }}>{c.departments.length}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Départements</div></div>
              <div><div className="mono" style={{ fontWeight: 700 }}>{c.payslips.length}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Fiches</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {c.id === activeId ? (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>École active</span>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={() => setActiveId(c.id)}><Eye size={13} /> Activer</button>
              )}
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal({ mode: "edit", school: c })}><Pencil size={14} /></button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={c.id === activeId || schools.length === 1}
                  style={(c.id === activeId || schools.length === 1) ? { opacity: 0.35, cursor: "not-allowed" } : {}}
                  title={c.id === activeId ? "Changez d'école active avant de la supprimer" : schools.length === 1 ? "Il faut garder au moins une école" : ""}
                  onClick={() => (c.id !== activeId && schools.length > 1) && setRemoveTarget(c)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ClientModal
          mode={modal.mode} school={modal.school} promoters={promoters} activePromoterId={activePromoter?.id}
          onClose={() => setModal(null)}
          onSaved={async () => { await refresh(); setModal(null); }}
        />
      )}

      {removeTarget && (
        <div className="modal-overlay" onClick={() => setRemoveTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-title">Supprimer {removeTarget.name} ?</p>
                <p className="modal-sub">Cela supprime {removeTarget.employees.length} employés et toutes leurs fiches de paie. Cette action est irréversible.</p>
              </div>
              <button className="close-btn" onClick={() => setRemoveTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRemoveTarget(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmRemove}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface ClientModalProps {
  mode: "add" | "edit";
  school?: School;
  promoters: PromoterWithSchools[];
  activePromoterId?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function ClientModal({ mode, school, promoters, activePromoterId, onClose, onSaved }: ClientModalProps) {
  const [name, setName] = useState(school?.name || "");
  const [domain, setDomain] = useState(school?.domain || "");
  const [description, setDescription] = useState(school?.description || "");
  const [color, setColor] = useState(school?.color || TAB_COLORS[0]);
  const [promoterId, setPromoterId] = useState(school?.promoterId || activePromoterId || promoters[0]?.id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const cleanDomain = domain.trim().toLowerCase();
    if (!name.trim()) return setError("Donnez un nom à cette école.");
    if (!cleanDomain || cleanDomain.includes(" ") || cleanDomain.includes("@")) return setError("Entrez un domaine simple, ex. cedres.edu.");
    if (!promoterId) return setError("Choisissez le promoteur de cette école.");
    setBusy(true);
    setError("");
    try {
      const body = { name: name.trim(), domain: cleanDomain, description: description.trim(), color, promoterId };
      if (mode === "edit") await api.updateSchool(school!.id, body);
      else await api.addSchool(body);
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
            <p className="modal-title">{mode === "edit" ? "Modifier l'école" : "Ajouter une école"}</p>
            <p className="modal-sub">{mode === "edit" ? "Mettre à jour les informations de l'école." : "Créer une nouvelle école dans le réseau."}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom de l'école</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Lycée Bilingue Aurora" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label">Promoteur</label>
          {mode === "add" ? (
            <div className="field" style={{ marginBottom: 4, background: "var(--sage-tint)", color: "var(--ink)", display: "flex", alignItems: "center" }}>
              {promoters.find((p) => p.id === promoterId)?.name || "—"}
            </div>
          ) : (
            <select className="field" style={{ marginBottom: 4 }} value={promoterId} onChange={(e) => setPromoterId(e.target.value)}>
              <option value="" disabled>Choisir un promoteur…</option>
              {promoters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>
            {mode === "add"
              ? "Cette école sera créée dans l'espace de ce promoteur."
              : "Déplacer cette école vers un autre promoteur la fera disparaître de cet espace."}
          </div>
          <label className="label">Domaine email</label>
          <input className="field" style={{ marginBottom: 4 }} placeholder="aurora.io" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>Utilisé pour les emails des employés, ex. nom@{domain || "domain.com"}</div>
          <label className="label">Description</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Primaire — Yaoundé" value={description} onChange={(e) => setDescription(e.target.value)} />
          <label className="label">Couleur</label>
          <div style={{ display: "flex", gap: 8 }}>
            {TAB_COLORS.map((c) => (
              <div key={c} onClick={() => setColor(c)} style={{
                width: 30, height: 30, borderRadius: 8, background: c, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: color === c ? "2px solid var(--ink)" : "2px solid transparent",
              }}>
                {color === c && <Check size={14} color="#fff" />}
              </div>
            ))}
          </div>
          {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>
            {busy ? "Saving…" : mode === "edit" ? "Enregistrer" : "Ajouter l'école"}
          </button>
        </div>
      </div>
    </div>
  );
}
