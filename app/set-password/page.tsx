"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { GraduationCap, CheckCircle2 } from "lucide-react";

interface CheckResult {
  valid: boolean;
  reason?: string;
  name?: string;
  email?: string;
}

function SetPasswordForm() {
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
    fetch(`/api/auth/set-password?token=${encodeURIComponent(token)}`)
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
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quelque chose s'est mal passé.");
      setDone(true);
      // Sign the person in immediately — they just proved ownership of the
      // invite link, no reason to make them re-type credentials right away.
      // Middleware sends each role to its own landing page, so /dashboard
      // is a safe universal target even for roles that live elsewhere.
      const signInRes = await signIn("credentials", { email: check?.email, password, redirect: false });
      if (signInRes?.error) {
        setTimeout(() => router.push("/login"), 1500);
        return;
      }
      router.push("/dashboard");
      router.refresh();
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
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Créer votre mot de passe</div>
          </div>
        </div>

        {check === null && <div style={{ fontSize: 13, color: "var(--muted)" }}>Vérification du lien…</div>}

        {check && !check.valid && (
          <div className="error-text">{check.reason || "Ce lien n'est pas valide."}</div>
        )}

        {check && check.valid && !done && (
          <form onSubmit={submit}>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Bonjour <strong>{check.name}</strong>, choisissez un mot de passe pour <strong>{check.email}</strong>.
            </div>
            <label className="label">Mot de passe</label>
            <input className="field" style={{ marginBottom: 14 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="label">Confirmer le mot de passe</label>
            <input className="field" style={{ marginBottom: 6 }} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 18 }}>Au moins 6 caractères.</div>
            {error && <div className="error-text" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
              {busy ? "Enregistrement…" : "Créer mon mot de passe"}
            </button>
          </form>
        )}

        {done && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--green-dark)", fontSize: 13.5 }}>
            <CheckCircle2 size={18} /> Mot de passe créé. Connexion en cours…
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
