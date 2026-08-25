"use client";

import React, { useEffect, useState } from "react";
import { Send, X, Ban, Mail } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { initials } from "@/lib/utils";
import { RECEIPT_STATUS_LABELS, RECEIPT_STATUS_PILL } from "@/lib/constants";
import { isValidEmail } from "@/lib/validation";
import type { ReceiptRequest, ReceiptRequestStatus, Student } from "@/lib/types";

export default function ReceiptRequestsPage() {
  const { school } = useSchools();
  const [requests, setRequests] = useState<ReceiptRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ReceiptRequestStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<ReceiptRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!school) return;
    setLoading(true);
    const list = await api.listReceiptRequests(school.id, statusFilter === "all" ? undefined : statusFilter);
    setRequests(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school, statusFilter]);

  if (!school) return null;

  async function decline(id: string) {
    await api.declineReceiptRequest(school!.id, id);
    await load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demandes de reçus</h1>
          <p className="page-subtitle">Copies de paiement demandées par les parents pour {school.name}</p>
        </div>
        <select className="select-el" style={{ width: 170 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | ReceiptRequestStatus)}>
          <option value="pending">En attente</option>
          <option value="sent">Envoyées</option>
          <option value="declined">Refusées</option>
          <option value="all">Toutes</option>
        </select>
      </div>

      {notice && <div className="card banner" style={{ borderColor: "var(--green)", background: "var(--green-tint)" }}><span style={{ fontSize: 13, color: "var(--green-dark)" }}>{notice}</span></div>}

      <div className="card banner">
        <div className="banner-icon"><Mail size={16} /></div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Les parents n&apos;ont pas de compte. Vérifiez l&apos;identité en associant la demande à l&apos;élève
          réel de votre effectif, puis envoyez la copie basée sur le registre réel des paiements.
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Élève (déclaré)</th><th>Période</th><th>Parent</th><th>Contact</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ background: school.color }}>{initials(r.studentName)}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.studentName}</div>
                      {r.className && <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.className}</div>}
                    </div>
                  </div>
                </td>
                <td>{r.period}</td>
                <td>{r.guardianName}</td>
                <td style={{ color: "var(--muted)" }}>{r.guardianEmail}{r.guardianPhone ? ` · ${r.guardianPhone}` : ""}</td>
                <td><span className={"pill " + RECEIPT_STATUS_PILL[r.status]}>{RECEIPT_STATUS_LABELS[r.status]}</span></td>
                <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {r.status === "pending" && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => setTarget(r)}><Send size={13} /> Traiter</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => decline(r.id)}><Ban size={13} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && requests.length === 0 && <tr><td colSpan={6} className="empty">Aucune demande pour ce filtre.</td></tr>}
          </tbody>
        </table>
      </div>

      {target && (
        <ResolveModal
          schoolId={school.id} request={target}
          onClose={() => setTarget(null)}
          onSent={async (simulated) => {
            setTarget(null);
            await load();
            setNotice(simulated ? "Reçu envoyé (simulé — configurez le SMTP pour un envoi réel)." : "Reçu envoyé au parent.");
            setTimeout(() => setNotice(null), 4500);
          }}
        />
      )}
    </>
  );
}

function ResolveModal({
  schoolId, request, onClose, onSent,
}: { schoolId: string; request: ReceiptRequest; onClose: () => void; onSent: (simulated: boolean) => void | Promise<void> }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [guardianEmail, setGuardianEmail] = useState(request.guardianEmail);
  const [guardianName, setGuardianName] = useState(request.guardianName);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listStudents(schoolId, request.period).then((list) => {
      setStudents(list);
      const guess = list.find((s) => s.name.toLowerCase() === request.studentName.toLowerCase());
      if (guess) setStudentId(guess.id);
    });
  }, [schoolId, request.period, request.studentName]);

  async function send() {
    if (!studentId) return setError("Choisissez l'élève correspondant dans votre effectif.");
    if (!isValidEmail(guardianEmail)) return setError("Cette adresse email n'est pas valide.");
    setBusy(true);
    setError("");
    try {
      const res = await api.sendReceiptForRequest(schoolId, request.id, { studentId, guardianEmail, guardianName });
      onSent(res.simulated);
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
            <p className="modal-title">Traiter la demande</p>
            <p className="modal-sub">{request.studentName} · {request.period}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {request.note && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14, padding: 10, background: "var(--cream)", borderRadius: 8 }}>
              Note du parent : {request.note}
            </div>
          )}
          <label className="label">Élève correspondant dans votre effectif</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.className}</option>)}
          </select>
          <div className="field-row">
            <div>
              <label className="label">Nom du destinataire</label>
              <input className="field" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email du destinataire</label>
              <input className="field" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            L&apos;email contiendra le détail réel des paiements enregistrés pour {request.period}, tel qu&apos;il figure dans le registre de l&apos;élève.
          </div>
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={send}><Send size={14} /> {busy ? "Envoi…" : "Envoyer le reçu"}</button>
        </div>
      </div>
    </div>
  );
}
