import type { DefaultSession, DefaultUser } from "next-auth";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      schoolId?: string;
      employeeId?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    schoolId?: string;
    employeeId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: Role;
    schoolId?: string;
    employeeId?: string;
  }
}
