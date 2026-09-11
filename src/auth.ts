import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Sessions stay JWT (see auth.config.ts), so the adapter is used only to
  // persist OAuth users and their Account rows — no Session rows are written,
  // and `proxy.ts` keeps importing the Prisma-free `authConfig`.
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      // Links a Google sign-in to an existing email/password account with the
      // same address instead of rejecting it. "Dangerous" in general because
      // some providers hand out unverified addresses; safe here because the
      // `signIn` callback below refuses anything Google hasn't verified.
      // Without it, an owner who clicks "Continue with Google" would be
      // stranded on OAuthAccountNotLinked — or, worse, land in an empty
      // duplicate account with none of their restaurant or Pro plan.
      allowDangerousEmailAccountLinking: true,
      profile: (profile) => ({
        id: profile.sub,
        // Signup lowercases every address it stores, and the adapter matches
        // by exact string. Normalize here or a `Owner@gmail.com` from Google
        // silently misses the existing row and creates a second account.
        email: profile.email.toLowerCase(),
        name: profile.name,
        image: profile.picture,
      }),
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      // The account linking above trusts the address Google reports, so this
      // is the guard that makes it safe: refuse any Google identity whose
      // email isn't verified, since an unverified one can be claimed.
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
  },
  events: {
    // Note: `events.createUser` also fires when an OAuth profile is *linked*
    // to an existing user, so it would over-count signups. `isNewUser` here is
    // the only signal that a row was actually created.
    async signIn({ account, isNewUser }) {
      if (account?.provider === "google" && isNewUser) {
        track("signup", { method: "google" }).catch(() => {});
      }
    },
  },
});
