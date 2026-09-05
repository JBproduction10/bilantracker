"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Send, Loader2, School as SchoolIcon } from "lucide-react";

type ProviderKind = "resend" | "sendgrid" | "smtp";

interface EmailConfigView {
  provider: ProviderKind;
  defaultIdentity: { fromName: string; fromEmail: string; replyTo: string };
  smtp: { host: string; port: number; secure: boolean; user: string; hasPassword: boolean };
  sendgrid: { hasApiKey: boolean };
  resend: { hasApiKey: boolean };
  notifications: { invite: boolean; passwordReset: boolean; payslip: boolean; receipt: boolean; inApp: boolean };
  configured: boolean;
  updatedAt: string | null;
}

interface SchoolIdentityView {
  schoolId: string;
  name: string;
  identity: { fromName: string; fromEmail: string; replyTo: string } | null;
}

type SchoolDraft = { fromName: string; fromEmail: string; replyTo: string };

const PROVIDER_LABEL: Record<ProviderKind, string> = {
  resend: "Resend",
  sendgrid: "SendGrid",
  smtp: "SMTP",
};

const NOTIFICATION_LABEL: Record<keyof EmailConfigView["notifications"], { label: string; hint: string }> = {
  invite: { label: "Invitations de compte", hint: "Email envoyé quand un compte est créé." },
  passwordReset: { label: "Réinitialisation de mot de passe", hint: "Email envoyé sur demande d'un utilisateur." },
  payslip: { label: "Fiches de paie", hint: "Email envoyé quand une fiche de paie est envoyée à un employé." },
  receipt: { label: "Reçus de paiement", hint: "Email envoyé quand un reçu est transmis à un parent." },
  inApp: {
    label: "Notifications de l'application",
    hint: "Email envoyé en plus de la cloche 🔔 pour chaque notification (bons de commande, grille salariale, fiches de paie prêtes, nouveaux comptes…).",
  },
};

const emptyDraft: SchoolDraft = { fromName: "", fromEmail: "", replyTo: "" };

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<EmailConfigView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  // Credential inputs are kept separate from `config` — the server never
  // sends saved secrets back, so these start blank and are only included
  // in the save request if the admin actually types something new.
  const [smtpPassword, setSmtpPassword] = useState("");
  const [sendgridKey, setSendgridKey] = useState("");
  const [resendKey, setResendKey] = useState("");

  const [schools, setSchools] = useState<SchoolIdentityView[] | null>(null);
  const [schoolDrafts, setSchoolDrafts] = useState<Record<string, SchoolDraft>>({});
  const [savingSchoolId, setSavingSchoolId] = useState<string | null>(null);

  function flash(text: string, error = false) {
    setNotice({ text, error });
    setTimeout(() => setNotice(null), 4500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/email", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setConfig(data);
      else flash(data.error ?? "Impossible de charger les paramètres email.", true);
    } catch {
      flash("Impossible de charger les paramètres email.", true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchools = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/email/schools", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setSchools(data.schools);
        setSchoolDrafts(
          Object.fromEntries(
            (data.schools as SchoolIdentityView[]).map((s) => [s.schoolId, s.identity ?? emptyDraft]),
          ),
        );
      } else {
        flash(data.error ?? "Impossible de charger les écoles.", true);
      }
    } catch {
      flash("Impossible de charger les écoles.", true);
    }
  }, []);

  useEffect(() => {
    load();
    loadSchools();
  }, [load, loadSchools]);

  function update<K extends keyof EmailConfigView>(key: K, value: EmailConfigView[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  function updateDraft(schoolId: string, patch: Partial<SchoolDraft>) {
    setSchoolDrafts((d) => ({ ...d, [schoolId]: { ...(d[schoolId] ?? emptyDraft), ...patch } }));
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          defaultIdentity: config.defaultIdentity,
          smtp: { ...config.smtp, password: smtpPassword || undefined },
          sendgrid: { apiKey: sendgridKey || undefined },
          resend: { apiKey: resendKey || undefined },
          notifications: config.notifications,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Échec de l'enregistrement.", true);
        return;
      }
      setConfig(data);
      setSmtpPassword("");
      setSendgridKey("");
      setResendKey("");
      flash("Paramètres email enregistrés.");
    } catch {
      flash("Échec de l'enregistrement.", true);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSchool(school: SchoolIdentityView) {
    const draft = schoolDrafts[school.schoolId];
    if (!draft?.fromName.trim() || !draft?.fromEmail.trim()) return;
    setSavingSchoolId(school.schoolId);
    try {
      const res = await fetch("/api/settings/email/schools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: school.schoolId,
          fromName: draft.fromName.trim(),
          fromEmail: draft.fromEmail.trim(),
          replyTo: draft.replyTo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Échec de l'enregistrement.", true);
        return;
      }
      await loadSchools();
      flash(`Identité email enregistrée pour ${school.name}.`);
    } catch {
      flash("Échec de l'enregistrement.", true);
    } finally {
      setSavingSchoolId(null);
    }
  }

  async function handleResetSchool(school: SchoolIdentityView) {
    setSavingSchoolId(school.schoolId);
    try {
      const res = await fetch("/api/settings/email/schools", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school.schoolId }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Échec de la réinitialisation.", true);
        return;
      }
      updateDraft(school.schoolId, emptyDraft);
      await loadSchools();
      flash(`Identité email réinitialisée pour ${school.name}.`);
    } catch {
      flash("Échec de la réinitialisation.", true);
    } finally {
      setSavingSchoolId(null);
    }
  }

  async function handleTest() {
    if (!testTo.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flash(
          data.simulated
            ? `Email de test simulé pour ${testTo.trim()} — configurez un fournisseur pour un envoi réel.`
            : `Email de test envoyé à ${testTo.trim()}.`,
        );
      } else {
        flash(data.error ?? "Échec de l'envoi du test.", true);
      }
    } catch {
      flash("Échec de l'envoi du test.", true);
    } finally {
      setTesting(false);
    }
  }

  if (loading || !config) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Paramètres email</h1>
            <p className="page-subtitle">Fournisseur d&apos;envoi, identité d&apos;expédition et notifications.</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: "var(--muted)" }}>
          <Loader2 className="spin" size={20} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres email</h1>
          <p className="page-subtitle">
            {config.configured
              ? "Configuration personnalisée active."
              : "Aucune configuration enregistrée — les variables d'environnement (ou le mode simulé) sont utilisées."}
          </p>
        </div>
      </div>

      {notice && (
        <div
          className="card banner"
          style={
            notice.error
              ? { borderColor: "var(--red)", background: "var(--red-tint)" }
              : { borderColor: "var(--green)", background: "var(--green-tint)" }
          }
        >
          <span style={{ fontSize: 13, color: notice.error ? "var(--red)" : "var(--green-dark)" }}>
            {notice.text}
          </span>
        </div>
      )}

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Mail size={16} style={{ color: "var(--muted)" }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Fournisseur & identité</div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ maxWidth: 260 }}>
            <label className="label">Envoyer avec</label>
            <select
              className="select-el"
              value={config.provider}
              onChange={(e) => update("provider", e.target.value as ProviderKind)}
            >
              {(Object.keys(PROVIDER_LABEL) as ProviderKind[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>Identité par défaut</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Utilisée pour les emails sans école précise, et comme repli pour toute école sans identité propre.
            </div>
          </div>

          <div className="field-row" style={{ marginBottom: 0 }}>
            <div>
              <label className="label">Nom d&apos;expéditeur</label>
              <input
                className="field"
                value={config.defaultIdentity.fromName}
                onChange={(e) => update("defaultIdentity", { ...config.defaultIdentity, fromName: e.target.value })}
                placeholder="École Bilan"
              />
            </div>
            <div>
              <label className="label">Email d&apos;expéditeur</label>
              <input
                className="field"
                type="email"
                value={config.defaultIdentity.fromEmail}
                onChange={(e) => update("defaultIdentity", { ...config.defaultIdentity, fromEmail: e.target.value })}
                placeholder="noreply@votreecole.com"
              />
            </div>
          </div>

          <div style={{ maxWidth: 320 }}>
            <label className="label">Répondre à</label>
            <input
              className="field"
              type="email"
              value={config.defaultIdentity.replyTo}
              onChange={(e) => update("defaultIdentity", { ...config.defaultIdentity, replyTo: e.target.value })}
              placeholder="admin@votreecole.com"
            />
          </div>

          {config.provider === "resend" && (
            <div style={{ maxWidth: 320 }}>
              <label className="label">Clé API Resend</label>
              <input
                className="field"
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder={config.resend.hasApiKey ? "Enregistrée — laisser vide pour garder" : "re_...."}
              />
            </div>
          )}

          {config.provider === "sendgrid" && (
            <div style={{ maxWidth: 320 }}>
              <label className="label">Clé API SendGrid</label>
              <input
                className="field"
                type="password"
                value={sendgridKey}
                onChange={(e) => setSendgridKey(e.target.value)}
                placeholder={config.sendgrid.hasApiKey ? "Enregistrée — laisser vide pour garder" : "SG...."}
              />
            </div>
          )}

          {config.provider === "smtp" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                padding: 16,
                borderRadius: 10,
                background: "var(--cream)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <label className="label">Hôte SMTP</label>
                <input
                  className="field"
                  value={config.smtp.host}
                  onChange={(e) => update("smtp", { ...config.smtp, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="label">Port</label>
                <input
                  className="field"
                  type="number"
                  value={config.smtp.port}
                  onChange={(e) => update("smtp", { ...config.smtp, port: Number(e.target.value) || 587 })}
                />
              </div>
              <div>
                <label className="label">Utilisateur</label>
                <input
                  className="field"
                  value={config.smtp.user}
                  onChange={(e) => update("smtp", { ...config.smtp, user: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input
                  className="field"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={config.smtp.hasPassword ? "Enregistré — laisser vide pour garder" : ""}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={config.smtp.secure}
                  onChange={(e) => update("smtp", { ...config.smtp, secure: e.target.checked })}
                />
                Utiliser TLS
              </label>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="spin" size={14} />}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <SchoolIcon size={16} style={{ color: "var(--muted)" }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Identité par école</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
          Chaque école peut envoyer sous son propre nom/adresse au lieu de l&apos;identité par défaut.
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {schools === null ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0", color: "var(--muted)" }}>
              <Loader2 className="spin" size={16} />
            </div>
          ) : schools.length === 0 ? (
            <p style={{ padding: "16px 0", fontSize: 13, color: "var(--muted)" }}>Aucune école.</p>
          ) : (
            schools.map((school, i) => {
              const draft = schoolDrafts[school.schoolId] ?? emptyDraft;
              const isSaving = savingSchoolId === school.schoolId;
              return (
                <div
                  key={school.schoolId}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "16px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700 }}>{school.name}</p>
                    {!school.identity && (
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Utilise l&apos;identité par défaut</span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <div>
                      <label className="label">Nom d&apos;expéditeur</label>
                      <input
                        className="field"
                        value={draft.fromName}
                        onChange={(e) => updateDraft(school.schoolId, { fromName: e.target.value })}
                        placeholder={school.name}
                      />
                    </div>
                    <div>
                      <label className="label">Email d&apos;expéditeur</label>
                      <input
                        className="field"
                        type="email"
                        value={draft.fromEmail}
                        onChange={(e) => updateDraft(school.schoolId, { fromEmail: e.target.value })}
                        placeholder="noreply@ecole.com"
                      />
                    </div>
                    <div>
                      <label className="label">Répondre à</label>
                      <input
                        className="field"
                        type="email"
                        value={draft.replyTo}
                        onChange={(e) => updateDraft(school.schoolId, { replyTo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    {school.identity && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleResetSchool(school)}
                        disabled={isSaving}
                      >
                        Réinitialiser
                      </button>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSaveSchool(school)}
                      disabled={isSaving || !draft.fromName.trim() || !draft.fromEmail.trim()}
                    >
                      {isSaving && <Loader2 className="spin" size={13} />}
                      Enregistrer
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Notifications</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          Désactivez un type d&apos;email sans toucher au reste de la configuration.
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {(Object.keys(NOTIFICATION_LABEL) as (keyof EmailConfigView["notifications"])[]).map((key, i) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "12px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600 }}>{NOTIFICATION_LABEL[key].label}</p>
                <p style={{ fontSize: 11.5, color: "var(--muted)" }}>{NOTIFICATION_LABEL[key].hint}</p>
              </div>
              <input
                type="checkbox"
                checked={config.notifications[key]}
                onChange={(e) => update("notifications", { ...config.notifications, [key]: e.target.checked })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Send size={16} style={{ color: "var(--muted)" }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Envoyer un email de test</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          Vérifie que la configuration ci-dessus fonctionne bien.
        </div>
        <div style={{ display: "flex", gap: 8, maxWidth: 380 }}>
          <input
            className="field"
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="vous@exemple.com"
          />
          <button className="btn btn-outline" onClick={handleTest} disabled={testing || !testTo.trim()}>
            {testing && <Loader2 className="spin" size={14} />}
            Tester
          </button>
        </div>
      </div>
    </>
  );
}
