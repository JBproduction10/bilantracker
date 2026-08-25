"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck } from "lucide-react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, initials } from "@/lib/utils";
import { AUDIT_ACTION_LABELS, ROLE_LABELS } from "@/lib/constants";
import type { AuditEntry } from "@/lib/types";

const MONEY_KEYS = new Set(["amount", "amountDue", "baseSalary", "monthlyFee", "net"]);

function formatDetails(details?: AuditEntry["details"]): string {
  if (!details) return "";
  return Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => {
      if (MONEY_KEYS.has(k) && typeof v === "number") return `${k}: ${money(v)}`;
      return `${k}: ${v}`;
    })
    .join(" · ");
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default function AuditLogPage() {
  const { data: session } = useSession();
  const { schools, school } = useSchools();
  const role = session?.user?.role;
  const canSeeAllSchools = role === "super_admin" || role === "promoter";

  const [filterSchoolId, setFilterSchoolId] = useState<string>("");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = await api.listAuditLogs(canSeeAllSchools ? filterSchoolId || undefined : undefined);
    setEntries(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterSchoolId, canSeeAllSchools]);

  const schoolName = useMemo(() => {
    const map = new Map(schools.map((s) => [s.id, s.name]));
    return (id?: string) => (id ? map.get(id) || "—" : "—");
  }, [schools]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Journal d&apos;audit</h1>
          <p className="page-subtitle">
            {canSeeAllSchools
              ? "Qui a fait quoi, quand — sur l'ensemble du réseau."
              : `Qui a fait quoi, quand — pour ${school?.name || "votre école"}.`}
          </p>
        </div>
        {canSeeAllSchools && (
          <select className="select-el" style={{ width: 220 }} value={filterSchoolId} onChange={(e) => setFilterSchoolId(e.target.value)}>
            <option value="">Toutes les écoles</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <div className="card banner">
        <div className="banner-icon"><ShieldCheck size={16} /></div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Chaque ajout, suppression ou modification touchant les paiements, les frais, les dépenses,
          les élèves, le personnel, les comptes et les écoles est enregistré ici — y compris les
          suppressions, qui ne laissaient aucune trace auparavant.
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Cible</th>{canSeeAllSchools && <th>École</th>}<th>Détail</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12.5 }}>{formatWhen(e.timestamp)}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="avatar" style={{ background: "#1F6E4D", width: 26, height: 26, fontSize: 10.5 }}>{initials(e.actorName)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{e.actorName}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{ROLE_LABELS[e.actorRole]}</div>
                    </div>
                  </div>
                </td>
                <td><span className="pill pill-active">{AUDIT_ACTION_LABELS[e.action]}</span></td>
                <td style={{ fontSize: 12.5 }}>{e.targetLabel || "—"}</td>
                {canSeeAllSchools && <td style={{ fontSize: 12.5 }}>{schoolName(e.schoolId)}</td>}
                <td style={{ fontSize: 11.5, color: "var(--muted)" }}>{formatDetails(e.details)}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={canSeeAllSchools ? 6 : 5} className="empty">Aucune activité enregistrée pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
