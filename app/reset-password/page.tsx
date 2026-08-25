"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, CheckCircle2 } from "lucide-react";

interface CheckResult {
  valid: boolean;
  reason?: string;
  name?: string;
  email?: string;
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [check, setCheck] = useState<CheckResult | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setCheck({ valid: false, reason: "Lien manquant." });
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setCheck)
      .catch(() => setCheck({ valid: false, reason: "Impossible de vérifier ce lien." }));
  }, [token]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quelque chose s'est mal passé.");
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div className="brand-mark"><GraduationCap size={17} /></div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>École Bilan</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Nouveau mot de passe</div>
          </div>
        </div>

        {check === null && <div style={{ fontSize: 13, color: "var(--muted)" }}>Vérification du lien…</div>}

        {check && !check.valid && (
          <div className="error-text">{check.reason || "Ce lien n'est pas valide."}</div>
        )}

        {check && check.valid && !done && (
          <form onSubmit={submit}>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Bonjour <strong>{check.name}</strong>, choisissez un nouveau mot de passe pour <strong>{check.email}</strong>.
            </div>
            <label className="label">Nouveau mot de passe</label>
            <input className="field" style={{ marginBottom: 14 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="label">Confirmer le mot de passe</label>
            <input className="field" style={{ marginBottom: 6 }} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 18 }}>Au moins 6 caractères.</div>
            {error && <div className="error-text" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
              {busy ? "Enregistrement…" : "Changer mon mot de passe"}
            </button>
          </form>
        )}

        {done && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--green-dark)", fontSize: 13.5 }}>
            <CheckCircle2 size={18} /> Mot de passe changé. Redirection vers la connexion…
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
