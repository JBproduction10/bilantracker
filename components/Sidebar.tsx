"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, Landmark, SlidersHorizontal, FileText, Send,
  GraduationCap, Wallet, BarChart3, ShieldCheck, Mail, History, ClipboardList, Package, Coins, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_BY_ROLE: Record<Role, { section: string; items: NavItem[] }[]> = {
  super_admin: [
    {
      section: "Gestion",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/schools", label: "Écoles", icon: Landmark },
        { href: "/users", label: "Comptes", icon: ShieldCheck },
      ],
    },
    {
      section: "Par école",
      items: [
        { href: "/students", label: "Élèves", icon: GraduationCap },
        { href: "/receipt-requests", label: "Demandes de reçus", icon: Mail },
        { href: "/expenses", label: "Dépenses", icon: Wallet },
        { href: "/employees", label: "Employés", icon: Users },
        { href: "/departments", label: "Départements", icon: Building2 },
        { href: "/purchase-orders", label: "Bons de commande", icon: ClipboardList },
        { href: "/inventory", label: "Intendance", icon: Package },
      ],
    },
    {
      section: "Paie",
      items: [
        { href: "/payslips", label: "Fiches de paie", icon: FileText },
        { href: "/send", label: "Envoyer les fiches", icon: Send },
        { href: "/fields", label: "Champs de paie", icon: SlidersHorizontal },
        { href: "/salary-grid", label: "Grille salariale", icon: Coins },
      ],
    },
    {
      section: "Supervision",
      items: [
        { href: "/reports", label: "Bilans", icon: BarChart3 },
        { href: "/audit-log", label: "Journal d'audit", icon: History },
      ],
    },
    {
      section: "Réglages",
      items: [{ href: "/settings/email", label: "Email", icon: Mail }],
    },
  ],
  promoter: [
    {
      section: "Vue d'ensemble",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/reports", label: "Bilans", icon: BarChart3 },
        { href: "/purchase-orders", label: "Bons de commande", icon: ClipboardList },
        { href: "/salary-grid", label: "Grille salariale", icon: Coins },
        { href: "/audit-log", label: "Journal d'audit", icon: History },
      ],
    },
  ],
  school_admin: [
    {
      section: "Gestion",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/students", label: "Élèves", icon: GraduationCap },
        { href: "/receipt-requests", label: "Demandes de reçus", icon: Mail },
        { href: "/expenses", label: "Dépenses", icon: Wallet },
        { href: "/purchase-orders", label: "Bons de commande", icon: ClipboardList },
        { href: "/inventory", label: "Intendance", icon: Package },
      ],
    },
    {
      section: "Personnel",
      items: [
        { href: "/employees", label: "Employés", icon: Users },
        { href: "/departments", label: "Départements", icon: Building2 },
      ],
    },
    {
      section: "Paie",
      items: [
        { href: "/payslips", label: "Fiches de paie", icon: FileText },
        { href: "/send", label: "Envoyer les fiches", icon: Send },
        { href: "/fields", label: "Champs de paie", icon: SlidersHorizontal },
        { href: "/salary-grid", label: "Grille salariale (Bonté Service)", icon: Coins },
      ],
    },
  ],
  finance: [
    {
      section: "Paie",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/payslips", label: "Fiches de paie", icon: FileText },
      ],
    },
  ],
  teacher: [
    {
      section: "Vous",
      items: [{ href: "/my-payslips", label: "Mes fiches", icon: FileText }],
    },
  ],
  treasury: [
    {
      section: "Bonté Service",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/purchase-orders", label: "Bons de commande", icon: ClipboardList },
        { href: "/salary-grid", label: "Grille salariale", icon: Coins },
        { href: "/reports", label: "Bilans", icon: BarChart3 },
      ],
    },
  ],
  logistics: [
    {
      section: "Intendance",
      items: [{ href: "/inventory", label: "Fournitures & stock", icon: Package }],
    },
  ],
  cashier: [
    {
      section: "Caisse",
      items: [
        { href: "/students", label: "Élèves", icon: GraduationCap },
        { href: "/receipt-requests", label: "Demandes de reçus", icon: Mail },
        { href: "/expenses", label: "Dépenses", icon: Wallet },
      ],
    },
  ],
};

export default function Sidebar({
  mobileOpen = false,
  onClose,
}: { mobileOpen?: boolean; onClose?: () => void } = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const role = (user?.role || "school_admin") as Role;
  const sections = NAV_BY_ROLE[role] || [];

  return (
    <div className={"sidebar" + (mobileOpen ? " mobile-open" : "")}>
      <div className="brand">
        <div className="brand-mark"><GraduationCap size={17} /></div>
        <div>
          <div className="brand-name">École Bilan</div>
          <div className="brand-sub">{ROLE_LABELS[role]}</div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Fermer le menu">
          <X size={18} />
        </button>
      </div>

      {sections.map((section) => (
        <React.Fragment key={section.section}>
          <div className="nav-section">{section.section}</div>
          {section.items.map((item) => (
            <Link key={item.href} href={item.href} className={"nav-item" + (pathname === item.href ? " active" : "")}>
              <item.icon size={16} /> {item.label}
            </Link>
          ))}
        </React.Fragment>
      ))}

      <div className="sidebar-admin">
        <div className="avatar-sm">{(user?.name || "A").slice(0, 2).toUpperCase()}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{user?.email}</div>
        </div>
      </div>
    </div>
  );
}
