"use client";

import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSchools } from "@/context/SchoolContext";
import NotificationBell from "@/components/NotificationBell";

export default function Topbar() {
  const { schools, school, setActiveId } = useSchools();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const canSwitch = schools.length > 1;

  if (!school) return <div className="topbar" />;

  return (
    <div className="topbar">
      <div
        className="school-switch"
        onClick={() => canSwitch && setOpen((o) => !o)}
        style={canSwitch ? {} : { cursor: "default" }}
      >
        <div className="chip" style={{ background: school.color }}>
          {initials(school.name)}
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{school.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{school.description}</div>
        </div>
        {canSwitch && <ChevronDown size={15} style={{ marginLeft: 4, color: "var(--muted)" }} />}

        {open && canSwitch && (
          <div className="school-menu" onMouseLeave={() => setOpen(false)}>
            {schools.map((c) => (
              <div key={c.id} className="school-menu-item" onClick={() => { setActiveId(c.id); setOpen(false); }}>
                <div className="chip" style={{ background: c.color, width: 24, height: 24, fontSize: 10 }}>{initials(c.name)}</div>
                <div style={{ flex: 1, fontSize: 13 }}>{c.name}</div>
                {c.id === school.id && <Check size={14} color="var(--green)" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <NotificationBell />
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          {session?.user?.name ? `Bonjour, ${session.user.name.split(" ")[0]}` : ""}
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
