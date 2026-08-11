import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

/**
 * Blueprint auth config (NextAuth v4, JWT sessions — no database adapter).
 *
 * Why no adapter: @auth/prisma-adapter expects a `name` field on User and
 * owns account/session persistence for OAuth flows. Blueprint's User model
 * uses firstName/lastName (not `name`) and Credentials-based auth can't
 * use database sessions anyway (NextAuth requires JWT sessions whenever a
 * Credentials provider is present). Instead, both providers below
 * find-or-create the Prisma User directly inside the `jwt` callback, which
 * works identically for Credentials and OAuth and avoids the schema
 * mismatch. See docs/BUILD_STATUS.md for the tradeoffs.
 *
 * Google sign-in is architected here (Task 3) but stays inactive — and is
 * left out of the `providers` array entirely — until GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET are set.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        // RATE LIMITING (launch-hardening audit finding): keyed by the
        // attempted email, not IP — NextAuth's authorize() has no access
        // to the request here, and a per-email cap is what actually stops
        // a credential-stuffing attack against one account. Returning
        // null is indistinguishable from "wrong password" to the caller
        // — deliberately, so this can't be used to fingerprint whether
        // an account is rate-limited vs. just guessed wrong.
        const rateLimit = await checkRateLimit(`login:${email}`, RATE_LIMITS.LOGIN_PER_EMAIL);
        if (!rateLimit.allowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !user.isActive) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user && account?.provider === "credentials") {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        return token;
      }

      if (account?.provider === "google" && profile?.email) {
        const email = profile.email.toLowerCase();
        const googleProfile = profile as {
          given_name?: string;
          family_name?: string;
          name?: string;
        };
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            firstName: googleProfile.given_name ?? googleProfile.name ?? "New",
            lastName: googleProfile.family_name ?? "Member",
            emailVerified: new Date(),
          },
        });
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.firstName = dbUser.firstName;
        token.lastName = dbUser.lastName;
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
