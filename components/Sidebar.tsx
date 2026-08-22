"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, Landmark, SlidersHorizontal, FileText, Send, LogOut,
  GraduationCap, Wallet, BarChart3, ShieldCheck,
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
      section: "Manage",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/schools", label: "Schools", icon: Landmark },
        { href: "/users", label: "Accounts", icon: ShieldCheck },
      ],
    },
    {
      section: "Per school",
      items: [
        { href: "/students", label: "Students", icon: GraduationCap },
        { href: "/expenses", label: "Expenses", icon: Wallet },
        { href: "/employees", label: "Employees", icon: Users },
        { href: "/departments", label: "Departments", icon: Building2 },
      ],
    },
    {
      section: "Payroll",
      items: [
        { href: "/payslips", label: "Payslips", icon: FileText },
        { href: "/send", label: "Send Payslips", icon: Send },
        { href: "/fields", label: "Field Designer", icon: SlidersHorizontal },
      ],
    },
    {
      section: "Oversight",
      items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
    },
  ],
  promoter: [
    {
      section: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/reports", label: "Reports", icon: BarChart3 },
      ],
    },
  ],
  school_admin: [
    {
      section: "Manage",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/students", label: "Students", icon: GraduationCap },
        { href: "/expenses", label: "Expenses", icon: Wallet },
      ],
    },
    {
      section: "Staff",
      items: [
        { href: "/employees", label: "Employees", icon: Users },
        { href: "/departments", label: "Departments", icon: Building2 },
      ],
    },
    {
      section: "Payroll",
      items: [
        { href: "/payslips", label: "Payslips", icon: FileText },
        { href: "/send", label: "Send Payslips", icon: Send },
        { href: "/fields", label: "Field Designer", icon: SlidersHorizontal },
      ],
    },
  ],
  finance: [
    {
      section: "Payroll",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/payslips", label: "Payslips", icon: FileText },
      ],
    },
  ],
  teacher: [
    {
      section: "You",
      items: [{ href: "/my-payslips", label: "My Payslips", icon: FileText }],
    },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const role = (user?.role || "school_admin") as Role;
  const sections = NAV_BY_ROLE[role] || [];

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-mark"><GraduationCap size={17} /></div>
        <div>
          <div className="brand-name">École Bilan</div>
          <div className="brand-sub">{ROLE_LABELS[role]}</div>
        </div>
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
        <button className="btn btn-ghost btn-sm" onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
