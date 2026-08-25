import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  GraduationCap, Wallet, ShieldCheck,
  ArrowRight, Sparkles, FileText, BarChart3, Users, Mail,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/lib/types";

const ROLE_HOME: Record<Role, string> = {
  super_admin: "/dashboard",
  promoter: "/dashboard",
  school_admin: "/dashboard",
  finance: "/dashboard",
  teacher: "/my-payslips",
};

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isSignedIn = !!session?.user;
  const role = session?.user?.role as Role | undefined;
  const primaryHref = isSignedIn ? (role ? ROLE_HOME[role] : "/dashboard") : "/login";
  const primaryLabel = isSignedIn ? "Accéder à mon espace" : "Se connecter";

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-brand">
          <div className="brand-mark"><GraduationCap size={17} /></div>
          <div className="landing-brand-name">École Bilan</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/receipt-request" className="btn btn-outline">
            <Mail size={14} /> Demander une copie de paiement
          </Link>
          <Link href={primaryHref} className="btn btn-primary">
            {primaryLabel} <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div>
          <div className="landing-eyebrow"><Sparkles size={13} /> Conçu pour les groupes scolaires à plusieurs établissements</div>
          <h1 className="landing-h1">
            Le bilan de chaque école, <span>en un coup d&apos;œil.</span>
          </h1>
          <p className="landing-sub">
            Suivez les effectifs et les paiements des élèves, gérez les salaires et les dépenses de chaque
            établissement, et donnez au promoteur une vue consolidée et fiable — sans dépendre des déclarations
            de chaque administrateur d&apos;école.
          </p>
          <div className="landing-cta-row">
            <Link href={primaryHref} className="btn btn-primary landing-btn-lg">
              {primaryLabel} <ArrowRight size={16} />
            </Link>
            {!isSignedIn && (
              <p className="landing-demo-note">
                Comptes de démo disponibles sur la page de connexion
              </p>
            )}
          </div>
        </div>

        <div className="landing-mock">
          <div className="landing-mock-topbar">
            <div className="landing-mock-dot" />
            <div className="landing-mock-dot" />
            <div className="landing-mock-dot" />
          </div>
          <div className="landing-mock-stats">
            <div className="landing-mock-stat">
              <div className="landing-mock-stat-label">Élèves (5 écoles)</div>
              <div className="landing-mock-stat-value">73</div>
            </div>
            <div className="landing-mock-stat">
              <div className="landing-mock-stat-label">Solde net</div>
              <div className="landing-mock-stat-value mono">1 240 500 FCFA</div>
            </div>
          </div>
          <div className="landing-mock-row">
            <div className="avatar" style={{ background: "#1F6E4D" }}>LC</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Les Cèdres</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>12 élèves · Yaoundé</div>
            </div>
            <span className="pill pill-sent">+485 000</span>
          </div>
          <div className="landing-mock-row">
            <div className="avatar" style={{ background: "#C99A3B" }}>LF</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>La Fontaine</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>10 élèves · Douala</div>
            </div>
            <span className="pill pill-draft">2 impayés</span>
          </div>
          <div className="landing-mock-row">
            <div className="avatar" style={{ background: "#9C6B8E" }}>SM</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Saint-Michel</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>6 élèves · nouvelle école</div>
            </div>
            <span className="pill pill-sent">+68 000</span>
          </div>
        </div>
      </section>

      <div className="landing-logos">
        <span>Pensé pour un réseau de 5 écoles :</span>
        <span className="landing-logo-chip"><span className="pill pill-active">Les Cèdres</span></span>
        <span className="landing-logo-chip"><span className="pill pill-leave">La Fontaine</span></span>
        <span className="landing-logo-chip"><span className="pill pill-inactive">Excellence</span></span>
        <span className="landing-logo-chip"><span className="pill pill-inactive">Horizon</span></span>
        <span className="landing-logo-chip"><span className="pill pill-inactive">Saint-Michel</span></span>
      </div>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2 className="landing-section-title">Un accès pensé pour chaque rôle</h2>
          <p className="landing-section-sub">
            Chacun ne voit que ce qui le concerne — et le promoteur peut enfin vérifier les chiffres
            de chaque école sans dépendre d&apos;un rapport transmis à la main.
          </p>
        </div>
        <div className="landing-feature-grid">
          <FeatureCard
            icon={<ShieldCheck size={18} />} tint="var(--green-tint)" color="var(--green-dark)"
            title="Super admin (nous)"
            desc="Gère le site pour tout le réseau : crée les écoles, les comptes, met à jour les données transmises par chaque établissement."
          />
          <FeatureCard
            icon={<BarChart3 size={18} />} tint="var(--gold-tint)" color="#8A6420"
            title="Promoteur"
            desc="Consulte le bilan consolidé des 5 écoles et le détail de chacune — entrées, sorties, effectifs déclarés — en quelques clics."
          />
          <FeatureCard
            icon={<Users size={18} />} tint="var(--sage-tint)" color="var(--green-dark)"
            title="Administrateur d'école"
            desc="Met à jour les effectifs et les paiements de sa propre école, ajoute les dépenses de fonctionnement, gère la paie du personnel."
          />
          <FeatureCard
            icon={<GraduationCap size={18} />} tint="var(--green-tint)" color="var(--green-dark)"
            title="Effectifs & paiements"
            desc="À jour, partiel, impayé, cas social — chaque élève a un statut clair, et le total encaissé se calcule automatiquement."
          />
          <FeatureCard
            icon={<Wallet size={18} />} tint="var(--gold-tint)" color="#8A6420"
            title="Dépenses de fonctionnement"
            desc="Carburant, crédit, rénovation, fournitures — chaque sortie est catégorisée et vient s'imputer sur le bilan de l'école."
          />
          <FeatureCard
            icon={<FileText size={18} />} tint="var(--sage-tint)" color="var(--green-dark)"
            title="Fiches de paie & accès enseignant"
            desc="Génération en un clic, envoi par email, et un accès dédié pour que le personnel finance ou chaque enseignant consulte ses fiches."
          />
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-section-head">
          <h2 className="landing-section-title">Comment ça marche</h2>
          <p className="landing-section-sub">De l&apos;inscription d&apos;un élève au bilan consolidé du promoteur.</p>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h3 className="landing-step-title">L'école déclare ses chiffres</h3>
            <p className="landing-step-desc">L'administrateur enregistre les élèves, leurs paiements, le personnel et les dépenses de son école.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h3 className="landing-step-title">La paie se génère automatiquement</h3>
            <p className="landing-step-desc">Un clic calcule les fiches de tout le personnel à partir des champs configurés pour l'école.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h3 className="landing-step-title">Le promoteur vérifie</h3>
            <p className="landing-step-desc">Le bilan consolidé confronte les entrées déclarées et les sorties, école par école, sans intermédiaire.</p>
          </div>
        </div>
      </section>

      <div className="landing-cta-band">
        <div>
          <h2>Prêt à voir le bilan en direct ?</h2>
          <p>Connectez-vous avec un compte de démo — les 5 écoles sont déjà chargées avec des données réalistes.</p>
        </div>
        <Link href={primaryHref} className="btn landing-btn-white landing-btn-lg">
          {primaryLabel} <ArrowRight size={16} />
        </Link>
      </div>

      <footer className="landing-footer">
        <div className="landing-brand">
          <div className="brand-mark" style={{ width: 26, height: 26 }}><GraduationCap size={13} /></div>
          <span>École Bilan</span>
        </div>
        <div>Construit avec Next.js, MongoDB et NextAuth.</div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon, tint, color, title, desc,
}: {
  icon: React.ReactNode;
  tint: string;
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="card landing-feature-card">
      <div className="landing-feature-icon" style={{ background: tint, color }}>{icon}</div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{desc}</p>
    </div>
  );
}
