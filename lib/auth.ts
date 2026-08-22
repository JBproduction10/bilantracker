import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import { getDb } from "./mongodb";
import { ensureSeeded } from "./seed";
import type { AppUser } from "./types";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await ensureSeeded();
        const db = await getDb();
        const user = await db.collection<AppUser>("users").findOne({ email: credentials.email.toLowerCase() });
        if (!user) return null;
        const valid = bcrypt.compareSync(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as AppUser & { id: string };
        token.uid = u.id;
        token.role = u.role;
        token.schoolId = u.schoolId;
        token.employeeId = u.employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
        session.user.employeeId = token.employeeId;
      }
      return session;
    },
  },
};
