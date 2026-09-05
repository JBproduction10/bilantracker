"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { api, type PromoterWithSchools } from "@/lib/apiClient";

const STORAGE_KEY = "ledger.activePromoterId";

interface PromoterWorkspaceValue {
  /** Only the super admin picks a workspace — everyone else is already scoped by their own session. */
  isSuperAdmin: boolean;
  promoters: PromoterWithSchools[];
  activePromoterId: string | null;
  activePromoter: PromoterWithSchools | null;
  setActivePromoterId: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<PromoterWithSchools[]>;
}

const PromoterWorkspaceContext = createContext<PromoterWorkspaceValue | null>(null);

export function PromoterWorkspaceProvider({ children }: { children: ReactNode }) {
  const { status, data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

  const [promoters, setPromoters] = useState<PromoterWithSchools[]>([]);
  const [activePromoterId, setActivePromoterIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Read the last-chosen workspace from localStorage once, on mount, so a
  // page refresh doesn't drop the super admin back into an empty state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setActivePromoterIdState(window.localStorage.getItem(STORAGE_KEY));
    setHydrated(true);
  }, []);

  const setActivePromoterId = useCallback((id: string | null) => {
    setActivePromoterIdState(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refresh = useCallback(async () => {
    if (!isSuperAdmin) return [];
    const list = await api.listPromoters();
    setPromoters(list);
    return list;
  }, [isSuperAdmin]);

  useEffect(() => {
    if (status !== "authenticated" || !hydrated) return;
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh()
      .then((list) => {
        // A stored id from a promoter that no longer exists (deleted since
        // the last visit) shouldn't strand the workspace in a dead state.
        setActivePromoterIdState((prev) => {
          if (prev && !list.some((p) => p.id === prev)) {
            if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
            return null;
          }
          return prev;
        });
      })
      .finally(() => setLoading(false));
  }, [status, hydrated, isSuperAdmin, refresh]);

  const activePromoter = promoters.find((p) => p.id === activePromoterId) || null;

  return (
    <PromoterWorkspaceContext.Provider
      value={{ isSuperAdmin, promoters, activePromoterId, activePromoter, setActivePromoterId, loading, refresh }}
    >
      {children}
    </PromoterWorkspaceContext.Provider>
  );
}

export function usePromoterWorkspace(): PromoterWorkspaceValue {
  const ctx = useContext(PromoterWorkspaceContext);
  if (!ctx) throw new Error("usePromoterWorkspace must be used within a PromoterWorkspaceProvider");
  return ctx;
}
