"use client";

import React, { useState } from "react";
import { Plus, X, Pencil, Trash2, AlertCircle } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money } from "@/lib/utils";
import type { School, FieldCategory, FieldItem, FieldType } from "@/lib/types";

interface Section {
  key: FieldCategory;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tint: string;
}

const SECTIONS: Section[] = [
  { key: "earnings", title: "Gains", desc: "Montants ajoutés au salaire de base", icon: <Plus size={16} />, tint: "var(--green)" },
  { key: "deductions", title: "Retenues", desc: "Montants déduits du salaire brut", icon: <X size={16} />, tint: "var(--red)" },
  { key: "info", title: "Informations", desc: "Détails affichés sur chaque fiche de paie", icon: <AlertCircle size={16} />, tint: "var(--gold)" },
];

interface FieldModalState {
  category: FieldCategory;
  field: FieldItem | null;
}

export default function FieldDesigner() {
  const { school, refresh } = useSchools();
  const [modal, setModal] = useState<FieldModalState | null>(null);
  if (!school) return null;

  async function removeField(category: FieldCategory, id: string) {
    await api.removeField(school!.id, category, id);
    await refresh();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Champs de paie</h1>
          <p className="page-subtitle">Configurez précisément ce qui apparaît sur chaque fiche de paie de {school.name}.</p>
        </div>
      </div>

      <div className="field-grid">
        {SECTIONS.map((s) => (
          <div key={s.key} className="card">
            <div className="field-card-head">
              <div className="field-card-icon" style={{ background: s.tint }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.desc}</div>
              </div>
            </div>
            {school.fields[s.key].map((f) => (
              <div key={f.id} className="field-item">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                    {f.label}
                    {f.required && <span className="pill pill-leave" style={{ fontSize: 10 }}>Obligatoire</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {s.key === "info" ? "Champ texte" : f.type === "percent" ? `Pourcentage · ${f.value}%` : `Montant fixe · ${money(f.value || 0)}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal({ category: s.key, field: f })}><Pencil size={13} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeField(s.key, f.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            <div style={{ padding: 14 }}>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--green-dark)" }} onClick={() => setModal({ category: s.key, field: null })}>
                <Plus size={14} /> Ajouter {s.key === "info" ? "une information" : s.key === "earnings" ? "un gain" : "une retenue"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <FieldModal
          school={school} category={modal.category} field={modal.field}
          onClose={() => setModal(null)}
          onSaved={async () => { await refresh(); setModal(null); }}
        />
      )}
    </>
  );
}

interface FieldModalProps {
  school: School;
  category: FieldCategory;
  field: FieldItem | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function FieldModal({ school, category, field, onClose, onSaved }: FieldModalProps) {
  const isInfo = category === "info";
  const [label, setLabel] = useState(field?.label || "");
  const [type, setType] = useState<FieldType>(field?.type || "fixed");
  const [value, setValue] = useState<string | number>(field?.value ?? "");
  const [required, setRequired] = useState(field?.required || false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!label.trim()) return setError("Donnez un libellé à ce champ.");
    if (!isInfo && value === "") return setError("Entrez un montant ou un pourcentage.");
    setBusy(true);
    setError("");
    const body = { label: label.trim(), required, ...(isInfo ? {} : { type, value: Number(value) }) };
    try {
      if (field) await api.updateField(school.id, category, field.id, body);
      else await api.addField(school.id, category, body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="modal-title">{field ? "Modifier le champ" : "Ajouter un champ"}</p>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="label">Libellé du champ</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Heures supplémentaires" value={label} onChange={(e) => setLabel(e.target.value)} />
          {!isInfo && (
            <div className="field-row">
              <div>
                <label className="label">Type</label>
                <select className="select-el" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
                  <option value="fixed">Montant fixe</option>
                  <option value="percent">Pourcentage</option>
                </select>
              </div>
              <div>
                <label className="label">{type === "percent" ? "Pourcentage (%)" : "Montant (FCFA)"}</label>
                <input className="field" type="number" placeholder={type === "percent" ? "5" : "5000"} value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Champ obligatoire
          </label>
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer le champ"}</button>
        </div>
      </div>
    </div>
  );
}
