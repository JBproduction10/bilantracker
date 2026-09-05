"use client";

import React, { useEffect, useState } from "react";
import { Plus, X, Pencil, Trash2, Landmark, Coins } from "lucide-react";
import { api, type PromoterWithSchools } from "@/lib/apiClient";
import type { PromoterInput } from "@/lib/types";

interface ModalState {
  mode: "add" | "edit";
  promoter?: PromoterWithSchools;
}

export default function PromotersPage() {
  const [promoters, setPromoters] = useState<PromoterWithSchools[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PromoterWithSchools | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setPromoters(await api.listPromoters());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function confirmRemove() {
    try {
      await api.removePromoter(removeTarget!.id);
      setRemoveTarget(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
      setRemoveTarget(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Promoteurs</h1>
          <p className="page-subtitle">
            Chaque promoteur gère un ou plusieurs écoles, avec ou sans sa propre société de trésorerie.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: "add" })}><Plus size={15} /> Ajouter un promoteur</button>
      </div>

      {error && <div className="error-text" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="dept-grid">
        {promoters.map((p) => (
          <div key={p.id} className="card dept-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="avatar" style={{ background: "#1F6E4D", width: 38, height: 38, borderRadius: 9, fontSize: 13 }}>
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {p.schools.length} école{p.schools.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 12.5 }}>
              {p.hasTreasury ? (
                <span className="pill pill-sent"><Coins size={11} style={{ marginRight: 4 }} />{p.treasuryName || "Bonté Service"}</span>
              ) : (
                <span className="pill pill-draft">Chaque école gère ses propres finances</span>
              )}
            </div>

            {p.schools.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {p.schools.map((s) => (
                  <span key={s.id} className="pill pill-active" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Landmark size={11} /> {s.name}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal({ mode: "edit", promoter: p })}><Pencil size={14} /></button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={p.schools.length > 0}
                style={p.schools.length > 0 ? { opacity: 0.35, cursor: "not-allowed" } : {}}
                title={p.schools.length > 0 ? "Réaffectez d'abord les écoles de ce promoteur" : ""}
                onClick={() => p.schools.length === 0 && setRemoveTarget(p)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!loading && promoters.length === 0 && <div className="card empty">Aucun promoteur pour l&apos;instant.</div>}
      </div>

      {modal && (
        <PromoterModal
          mode={modal.mode}
          promoter={modal.promoter}
          onClose={() => setModal(null)}
          onSaved={async () => { await load(); setModal(null); }}
        />
      )}

      {removeTarget && (
        <div className="modal-overlay" onClick={() => setRemoveTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-title">Supprimer {removeTarget.name} ?</p>
                <p className="modal-sub">Cette action est irréversible.</p>
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

function PromoterModal({
  mode, promoter, onClose, onSaved,
}: { mode: "add" | "edit"; promoter?: PromoterWithSchools; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [name, setName] = useState(promoter?.name || "");
  const [hasTreasury, setHasTreasury] = useState(promoter?.hasTreasury ?? false);
  const [treasuryName, setTreasuryName] = useState(promoter?.treasuryName || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return setError("Donnez un nom à ce promoteur.");
    setBusy(true);
    setError("");
    try {
      const body: PromoterInput = {
        name: name.trim(),
        hasTreasury,
        ...(hasTreasury ? { treasuryName: treasuryName.trim() || "Bonté Service" } : {}),
      };
      if (mode === "edit") await api.updatePromoter(promoter!.id, body);
      else await api.addPromoter(body);
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
            <p className="modal-title">{mode === "edit" ? "Modifier le promoteur" : "Ajouter un promoteur"}</p>
            <p className="modal-sub">
              {mode === "edit"
                ? "Mettre à jour les informations de ce promoteur."
                : "Un nouveau réseau, avec ses propres écoles à créer ensuite."}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Nom du promoteur</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Janet" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={hasTreasury} onChange={(e) => setHasTreasury(e.target.checked)} />
            Ce promoteur a sa propre société de trésorerie
          </label>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, marginBottom: 14 }}>
            Si désactivé, chaque école de ce promoteur gère ses propres finances directement — pas de compte
            trésorerie séparé, pas de file d&apos;attente réseau pour les bons de commande ou la grille salariale.
          </div>

          {hasTreasury && (
            <>
              <label className="label">Nom de la société de trésorerie</label>
              <input
                className="field"
                placeholder="ex. Bonté Service"
                value={treasuryName}
                onChange={(e) => setTreasuryName(e.target.value)}
              />
            </>
          )}

          {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>
            {busy ? "Enregistrement…" : mode === "edit" ? "Enregistrer" : "Ajouter le promoteur"}
          </button>
        </div>
      </div>
    </div>
  );
}
