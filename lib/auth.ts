import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import { getDb } from "./mongodb";
import { ensureSeeded } from "./seed";
import { checkRateLimit, getClientIpFromHeaderRecord } from "./rateLimit";
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Two independent buckets: per-IP (catches someone spraying many
        // emails from one place) and per-email (catches someone hammering
        // one account from many places, e.g. a botnet). Both are checked —
        // and both consumed — before touching the database, so a lockout
        // never depends on whether the account exists.
        const email = credentials.email.trim().toLowerCase();
        const ip = getClientIpFromHeaderRecord(req?.headers as Record<string, string> | undefined);
        const ipOk = checkRateLimit(`login:ip:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 }).allowed;
        const emailOk = checkRateLimit(`login:email:${email}`, { limit: 8, windowMs: 15 * 60 * 1000 }).allowed;
        if (!ipOk || !emailOk) return null;

        await ensureSeeded();
        const db = await getDb();
        const user = await db.collection<AppUser>("users").findOne({ email });
        if (!user) return null;
        // Pending accounts (created via the invite flow, no password set yet)
        // must use their invite link first — that's the only thing that
        // blocks login. An account with a password hash already set is
        // treated as active even if it predates the `status` field, so
        // upgrading the app doesn't lock out accounts seeded before this
        // feature existed.
        if (user.status === "pending" || !user.passwordHash) return null;
        const valid = bcrypt.compareSync(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          promoterId: user.promoterId,
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
        token.promoterId = u.promoterId;
        token.employeeId = u.employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
        session.user.promoterId = token.promoterId;
        session.user.employeeId = token.employeeId;
      }
      return session;
    },
  },
};
