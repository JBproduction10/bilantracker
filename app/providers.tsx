"use client";

import React, { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { PromoterWorkspaceProvider } from "@/context/PromoterContext";
import { SchoolProvider } from "@/context/SchoolContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PromoterWorkspaceProvider>
        <SchoolProvider>{children}</SchoolProvider>
      </PromoterWorkspaceProvider>
    </SessionProvider>
  );
}
