"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { GraduationCap, ChevronRight } from "lucide-react";
import { ROLE_HOME } from "@/lib/roleHome";
import type { Role } from "@/lib/types";

const DEMO_ACCOUNTS = [
  { label: "Super Admin (nous)", email: "admin@ledger.io", password: "admin1234", desc: "Gestion complète du site" },
  { label: "Promoteur", email: "promoteur@groupescolaire.cm", password: "promoteur1234", desc: "Bilan des 5 écoles" },
  {
    label: "Trésorerie — Bonté Service",
    email: "tresorerie@bonteservice.cm",
    password: "tresorerie1234",
    desc: "Trésorerie & paiements",
  },
  {
    label: "Intendance — Les Cèdres",
    email: "intendance.cedres@groupescolaire.cm",
    password: "intendance1234",
    desc: "Achats, stock & logistique",
  },
  { label: "Admin d'école — Les Cèdres", email: "admin.cedres@groupescolaire.cm", password: "ecole1234", desc: "Élèves, dépenses, paie" },
  { label: "Caisse — Les Cèdres", email: "caisse.cedres@groupescolaire.cm", password: "caisse1234", desc: "Inscriptions & encaissement des frais" },
  { label: "Finance — Les Cèdres", email: "finance.cedres@groupescolaire.cm", password: "finance1234", desc: "Consultation & impression des fiches" },
  { label: "Enseignant — La Fontaine", email: "enseignant.fontaine@groupescolaire.cm", password: "enseignant1234", desc: "Ses fiches de paie uniquement" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ledger.io");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await signIn("credentials", { redirect: false, email, password });
    setBusy(false);
    if (res?.error) {
      setError("Cet email ou ce mot de passe est incorrect. Si vous venez d'être invité, vérifiez d'abord votre email pour créer votre mot de passe.");
    } else {
      const session = await getSession();
      const role = session?.user?.role as Role | undefined;
      router.push((role && ROLE_HOME[role]) || "/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="login-wrap">
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
        <div className="login-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div className="brand-mark"><GraduationCap size={17} /></div>
            <div>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>École Bilan</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Connexion</div>
            </div>
          </div>
          <form onSubmit={submit}>
            <label className="label">Email</label>
            <input className="field" style={{ marginBottom: 14 }} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <label className="label">Mot de passe</label>
            <input className="field" style={{ marginBottom: 6 }} value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 18 }}>Choisissez un compte de démo à droite, ou saisissez vos identifiants.</div>
            {error && <div className="error-text" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
              {busy ? "Connexion…" : "Se connecter"}
            </button>
            <Link href="/forgot-password" style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 12.5, color: "var(--muted)" }}>
              Mot de passe oublié ?
            </Link>
          </form>
        </div>

        <div className="card" style={{ width: 340, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Comptes de démonstration</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Cliquez pour remplir le formulaire.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  textAlign: "left", padding: "10px 12px", borderRadius: 10,
                  border: email === acc.email ? "1px solid var(--green)" : "1px solid var(--border)",
                  background: email === acc.email ? "var(--green-tint)" : "var(--paper)",
                  cursor: "pointer", font: "inherit",
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{acc.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{acc.desc}</div>
                </div>
                <ChevronRight size={14} color="var(--muted)" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
