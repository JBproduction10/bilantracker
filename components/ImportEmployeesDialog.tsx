"use client";

import React, { useRef, useState } from "react";
import { Upload, FileDown, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { csvToObjects, downloadText } from "@/lib/csv";
import type { Department, Employee, EmployeeStatus } from "@/lib/types";

const TEMPLATE = `name,position,department,baseSalary,status,joinDate
Jean Mballa,Enseignant,Pédagogie,150000,Active,2026-09-01
Adèle Ngo,Comptable,Administration,180000,Active,`;

type ParsedRow =
  | { ok: true; line: number; employee: Partial<Employee> }
  | { ok: false; line: number; reason: string };

function parseStatus(value: string | undefined): EmployeeStatus {
  const v = value?.trim().toLowerCase();
  if (v === "leave" || v === "on leave" || v === "congé" || v === "en congé") return "On Leave";
  if (v === "inactive" || v === "inactif") return "Inactive";
  return "Active";
}

function buildParser(departments: Department[]) {
  return function parseRows(csvText: string): ParsedRow[] {
    const rows = csvToObjects(csvText);
    return rows.map((row, i) => {
      const line = i + 2;
      const name = row.name?.trim();
      const position = row.position?.trim();
      const deptName = row.department?.trim();
      const salaryRaw = row.basesalary?.trim();

      if (!name) return { ok: false, line, reason: "Nom manquant." };
      if (!position) return { ok: false, line, reason: "Poste manquant." };

      const department = departments.find((d) => d.name.toLowerCase() === deptName?.toLowerCase());
      if (!department) {
        const available = departments.map((d) => d.name).join(", ");
        return { ok: false, line, reason: `Département inconnu : "${deptName ?? ""}". Disponibles : ${available}.` };
      }

      const baseSalary = Number(salaryRaw);
      if (!salaryRaw || Number.isNaN(baseSalary) || baseSalary <= 0) {
        return { ok: false, line, reason: `Salaire de base invalide : "${salaryRaw ?? ""}".` };
      }

      return {
        ok: true,
        line,
        employee: {
          name, position, department: department.name, baseSalary,
          status: parseStatus(row.status), joinDate: row.joindate?.trim() || undefined,
        },
      };
    });
  };
}

export function ImportEmployeesDialog({
  schoolId, departments, onClose, onImported,
}: { schoolId: string; departments: Department[]; onClose: () => void; onImported: () => void | Promise<void> }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: { line: number; reason: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseRows = buildParser(departments);

  const valid = parsed?.filter((r): r is Extract<ParsedRow, { ok: true }> => r.ok) ?? [];
  const invalid = parsed?.filter((r): r is Extract<ParsedRow, { ok: false }> => !r.ok) ?? [];

  function handleParse(value: string) {
    setText(value);
    setResult(null);
    setParsed(value.trim() ? parseRows(value) : null);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => handleParse(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    downloadText("modele-employes.csv", TEMPLATE, "text/csv;charset=utf-8");
  }

  async function handleImport() {
    if (valid.length === 0 || importing) return;
    setImporting(true);
    // Sequential on purpose — same read-modify-write race as student
    // import, since addEmployee also rewrites the whole school document.
    const failed: { line: number; reason: string }[] = [];
    let imported = 0;
    for (const row of valid) {
      try {
        await api.addEmployee(schoolId, row.employee);
        imported++;
      } catch (err) {
        failed.push({ line: row.line, reason: (err as Error).message });
      }
    }
    setImporting(false);
    setResult({ imported, failed });
    if (imported > 0) await onImported();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">Importer des employés</p>
            <p className="modal-sub">Collez un CSV ou choisissez un fichier — colonnes : name, position, department, baseSalary (obligatoires), status, joinDate (optionnelles). Le département doit correspondre à un département existant : {departments.map((d) => d.name).join(", ") || "aucun pour l'instant"}.</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={13} /> Choisir un fichier
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
              <FileDown size={13} /> Télécharger le modèle
            </button>
            <input
              ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ""; }}
            />
          </div>

          <textarea
            className="field" style={{ height: 130, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            placeholder={"name,position,department,baseSalary,...\nJean Mballa,Enseignant,Pédagogie,150000,..."}
            value={text} onChange={(e) => handleParse(e.target.value)}
          />

          {parsed && !result && (
            <div className="card" style={{ padding: 12, marginTop: 12, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green-dark)" }}>
                <CheckCircle2 size={15} /> {valid.length} ligne{valid.length === 1 ? "" : "s"} prête{valid.length === 1 ? "" : "s"}
              </div>
              {invalid.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8A6420" }}>
                    <AlertTriangle size={15} /> {invalid.length} ligne{invalid.length === 1 ? "" : "s"} ignorée{invalid.length === 1 ? "" : "s"}
                  </div>
                  <ul style={{ marginTop: 6, marginLeft: 18, maxHeight: 100, overflowY: "auto", fontSize: 11.5, color: "var(--muted)" }}>
                    {invalid.map((r, i) => <li key={i}>Ligne {r.line} : {r.reason}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="card" style={{ padding: 12, marginTop: 12, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green-dark)" }}>
                <CheckCircle2 size={15} /> {result.imported} employé{result.imported === 1 ? "" : "s"} importé{result.imported === 1 ? "" : "s"}.
              </div>
              {result.failed.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)" }}>
                    <AlertTriangle size={15} /> {result.failed.length} ligne{result.failed.length === 1 ? "" : "s"} refusée{result.failed.length === 1 ? "" : "s"} par le serveur
                  </div>
                  <ul style={{ marginTop: 6, marginLeft: 18, maxHeight: 100, overflowY: "auto", fontSize: 11.5, color: "var(--muted)" }}>
                    {result.failed.map((r, i) => <li key={i}>Ligne {r.line} : {r.reason}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>{result ? "Fermer" : "Annuler"}</button>
          {!result && (
            <button className="btn btn-primary" disabled={valid.length === 0 || importing} onClick={handleImport}>
              {importing ? "Import…" : `Importer ${valid.length || ""} employé${valid.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
