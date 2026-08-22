"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/apiClient";
import type { School } from "@/lib/types";

interface SchoolContextValue {
  schools: School[];
  school: School | null;
  activeId: string | null;
  setActiveId: (id: string) => void;
  refresh: () => Promise<School[]>;
  loading: boolean;
}

const SchoolContext = createContext<SchoolContextValue | null>(null);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [schools, setSchools] = useState<School[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await api.listSchools();
    setSchools(list);
    setActiveId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0]?.id || null));
    return list;
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [status, refresh]);

  const school = schools.find((c) => c.id === activeId) || null;

  return (
    <SchoolContext.Provider value={{ schools, school, activeId, setActiveId, refresh, loading }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchools(): SchoolContextValue {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchools must be used within a SchoolProvider");
  return ctx;
}
