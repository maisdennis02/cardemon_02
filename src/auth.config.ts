import type { NextAuthConfig } from "next-auth";

// Edge-safe slice of the auth config. No Prisma / bcrypt imports here so it can
// be used from middleware. The full config in `auth.ts` extends this.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
};
