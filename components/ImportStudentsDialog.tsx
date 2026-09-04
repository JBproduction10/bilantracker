"use client";

import React, { useRef, useState } from "react";
import { Upload, FileDown, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { csvToObjects, downloadText } from "@/lib/csv";
import { isValidEmail } from "@/lib/validation";
import type { Student, StudentStatus, Cycle } from "@/lib/types";

const VALID_CYCLES: Cycle[] = ["primaire", "orientation", "superieur"];

const TEMPLATE = `name,className,cycle,monthlyFee,guardianName,guardianPhone,guardianEmail,status,joinDate,note
Aristide Fouda,1ère Primaire,primaire,25000,Mme Fouda,699000001,,active,2026-09-01,
Line Ngo Bikoi,1ère Primaire,primaire,25000,M. Bikoi,699000002,,active,,`;

type ParsedRow =
  | { ok: true; line: number; student: Partial<Student> }
  | { ok: false; line: number; reason: string };

function parseStatus(value: string | undefined): StudentStatus {
  return value?.trim().toLowerCase() === "withdrawn" ? "withdrawn" : "active";
}

function parseCycle(value: string | undefined): Cycle {
  const v = value?.trim().toLowerCase();
  return (VALID_CYCLES as string[]).includes(v ?? "") ? (v as Cycle) : "primaire";
}

function parseRows(csvText: string): ParsedRow[] {
  const rows = csvToObjects(csvText);
  return rows.map((row, i) => {
    const line = i + 2; // +1 for header row, +1 for 1-indexing
    const name = row.name?.trim();
    const className = row.classname?.trim() || row.class?.trim();
    const feeRaw = row.monthlyfee?.trim();

    if (!name) return { ok: false, line, reason: "Nom manquant." };
    if (!className) return { ok: false, line, reason: "Classe manquante." };
    const monthlyFee = Number(feeRaw);
    if (!feeRaw || Number.isNaN(monthlyFee) || monthlyFee <= 0) {
      return { ok: false, line, reason: `Frais mensuel invalide : "${feeRaw ?? ""}".` };
    }
    const guardianEmail = row.guardianemail?.trim() || "";
    if (guardianEmail && !isValidEmail(guardianEmail)) {
      return { ok: false, line, reason: `Email du tuteur invalide : "${guardianEmail}".` };
    }

    return {
      ok: true,
      line,
      student: {
        name, className, cycle: parseCycle(row.cycle), monthlyFee,
        guardianName: row.guardianname?.trim() || "",
        guardianPhone: row.guardianphone?.trim() || "",
        guardianEmail,
        status: parseStatus(row.status),
        joinDate: row.joindate?.trim() || undefined,
        note: row.note?.trim() || "",
      },
    };
  });
}

export function ImportStudentsDialog({
  schoolId, onClose, onImported,
}: { schoolId: string; onClose: () => void; onImported: () => void | Promise<void> }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: { line: number; reason: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    downloadText("modele-eleves.csv", TEMPLATE, "text/csv;charset=utf-8");
  }

  async function handleImport() {
    if (valid.length === 0 || importing) return;
    setImporting(true);
    // Sequential on purpose: each addStudent call reads-modifies-writes the
    // whole school document, so firing these concurrently would race and
    // silently drop rows.
    const failed: { line: number; reason: string }[] = [];
    let imported = 0;
    for (const row of valid) {
      try {
        await api.addStudent(schoolId, row.student);
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
            <p className="modal-title">Importer des élèves</p>
            <p className="modal-sub">Collez un CSV ou choisissez un fichier — colonnes : name, className, monthlyFee (obligatoires), cycle (primaire/orientation/superieur — primaire par défaut), guardianName, guardianPhone, guardianEmail, status, joinDate, note (optionnelles).</p>
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
            placeholder={"name,className,monthlyFee,...\nMarie Ateba,CM2,25000,..."}
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
                <CheckCircle2 size={15} /> {result.imported} élève{result.imported === 1 ? "" : "s"} importé{result.imported === 1 ? "" : "s"}.
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
              {importing ? "Import…" : `Importer ${valid.length || ""} élève${valid.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
