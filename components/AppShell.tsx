"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { usePromoterWorkspace } from "@/context/PromoterContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isSuperAdmin, activePromoterId, loading } = usePromoterWorkspace();

  // Close the drawer automatically whenever the route changes (link tap).
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  // Every super admin screen except the promoters list and site-wide
  // settings is scoped to one promoter's workspace — if none is chosen yet
  // (fresh login, direct URL, or the last one got deleted), send them back
  // to pick one rather than showing an empty/undefined network.
  useEffect(() => {
    const exempt = pathname === "/promoters" || pathname.startsWith("/settings");
    if (loading || !isSuperAdmin || activePromoterId || exempt) return;
    router.replace("/promoters");
  }, [loading, isSuperAdmin, activePromoterId, pathname, router]);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {mobileNavOpen && <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <div className="main">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
