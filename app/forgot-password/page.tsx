"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GraduationCap, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429 || res.status === 400) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Quelque chose s'est mal passé.");
        setBusy(false);
        return;
      }
    } catch {
      // fall through to the generic confirmation below
    }
    // Same confirmation whether or not the email matched an account —
    // that's the point. A rate-limit hit is the one thing we do say
    // honestly, since it reveals nothing about any particular account.
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div className="brand-mark"><GraduationCap size={17} /></div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>École Bilan</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Mot de passe oublié</div>
          </div>
        </div>

        {done ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--green-dark)", fontSize: 13.5, marginBottom: 18 }}>
              <CheckCircle2 size={18} /> Si un compte existe avec cet email, un lien vient d&apos;être envoyé.
            </div>
            <Link href="/login" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}>
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>
              Entrez l&apos;email de votre compte. Si un compte actif existe, vous recevrez un lien pour choisir un
              nouveau mot de passe. Si votre compte vient d&apos;être créé et que vous n&apos;avez pas encore de
              mot de passe, vous recevrez plutôt votre lien d&apos;invitation.
            </p>
            <label className="label">Email</label>
            <input className="field" style={{ marginBottom: 18 }} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div className="error-text" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
              {busy ? "Envoi…" : "Envoyer le lien"}
            </button>
            <Link href="/login" style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 12.5, color: "var(--muted)" }}>
              Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
