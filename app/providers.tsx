"use client";

import React, { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { SchoolProvider } from "@/context/SchoolContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SchoolProvider>{children}</SchoolProvider>
    </SessionProvider>
  );
}
