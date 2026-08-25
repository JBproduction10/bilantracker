"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, CheckCircle2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/apiClient";
import { PERIODS } from "@/lib/utils";
import { isValidEmail } from "@/lib/validation";
import type { PublicSchool } from "@/lib/types";

export default function ReceiptRequestPage() {
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [period, setPeriod] = useState(PERIODS[PERIODS.length - 1]);
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.listSchoolsPublic().then((list) => {
      setSchools(list);
      if (list[0]) setSchoolId(list[0].id);
    });
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!schoolId || !studentName.trim() || !guardianName.trim() || !guardianEmail.trim()) {
      setError("Merci de remplir l'école, le nom de l'élève, votre nom et votre email.");
      return;
    }
    if (!isValidEmail(guardianEmail)) {
      setError("Votre adresse email n'est pas valide.");
      return;
    }
    setBusy(true);
    try {
      await api.submitReceiptRequest(schoolId, {
        studentName: studentName.trim(), className: className.trim() || undefined, period,
        guardianName: guardianName.trim(), guardianEmail: guardianEmail.trim(),
        guardianPhone: guardianPhone.trim() || undefined, note: note.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="login-wrap">
        <div className="login-card" style={{ textAlign: "center" }}>
          <CheckCircle2 size={32} color="var(--green)" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Demande envoyée</div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
            L&apos;école vous enverra une copie du paiement par email dès que votre demande sera traitée.
          </p>
          <Link href="/" className="btn btn-outline" style={{ justifyContent: "center" }}>
            <ArrowLeft size={14} /> Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-card" style={{ width: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div className="brand-mark"><GraduationCap size={17} /></div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>École Bilan</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Demander une copie de paiement</div>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>
          Vous n&apos;avez pas besoin de compte. Remplissez ce formulaire et l&apos;école vous enverra
          une copie du paiement par email après vérification.
        </p>
        <form onSubmit={submit}>
          <label className="label">École</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="field-row">
            <div>
              <label className="label">Nom de l&apos;élève</label>
              <input className="field" placeholder="ex. Marie Ateba" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </div>
            <div>
              <label className="label">Classe (optionnel)</label>
              <input className="field" placeholder="ex. CM2" value={className} onChange={(e) => setClassName(e.target.value)} />
            </div>
          </div>

          <label className="label">Période concernée</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>

          <div className="field-row">
            <div>
              <label className="label">Votre nom</label>
              <input className="field" placeholder="ex. Mme Ateba" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div>
              <label className="label">Votre téléphone (optionnel)</label>
              <input className="field" placeholder="6XX XXX XXX" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
            </div>
          </div>

          <label className="label">Votre email</label>
          <input className="field" style={{ marginBottom: 14 }} type="email" placeholder="vous@email.com" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />

          <label className="label">Note (optionnel)</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="Précision utile pour l'école" value={note} onChange={(e) => setNote(e.target.value)} />

          {error && <div className="error-text" style={{ marginBottom: 14 }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
            {busy ? "Envoi…" : "Envoyer la demande"}
          </button>
        </form>
      </div>
    </div>
  );
}
