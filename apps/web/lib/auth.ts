import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const accessTokenLifetimeMs = 15 * 60 * 1000;
const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const buildSessionToken = (payload: any) => ({
  userId: payload.user.id,
  name: payload.user.name,
  email: payload.user.email,
  plan: payload.user.plan,
  accessToken: payload.accessToken,
  refreshToken: payload.refreshToken,
  accessTokenExpires: Date.now() + accessTokenLifetimeMs
});

async function refreshAccessToken(token: any) {
  const response = await fetch(`${apiUrl}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      refreshToken: token.refreshToken
    })
  });

  if (!response.ok) {
    return {
      ...token,
      error: "RefreshAccessTokenError"
    };
  }

  const refreshed = await response.json();

  return {
    ...token,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    accessTokenExpires: Date.now() + accessTokenLifetimeMs,
    plan: refreshed.user.plan,
    name: refreshed.user.name,
    email: refreshed.user.email
  };
}

async function exchangeGoogleIdToken(idToken: string) {
  const response = await fetch(`${apiUrl}/api/auth/oauth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      idToken
    })
  });

  if (!response.ok) {
    throw new Error("GoogleSignInError");
  }

  return response.json();
}

const nextAuth = NextAuth({
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        const response = await fetch(`${apiUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password
          })
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          plan: data.user.plan,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpires: Date.now() + accessTokenLifetimeMs
        };
      }
    }),
    ...(googleAuthEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
          })
        ]
      : [])
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (account?.provider === "google") {
        try {
          const payload = await exchangeGoogleIdToken(account.id_token as string);
          return {
            ...token,
            ...buildSessionToken(payload)
          };
        } catch {
          return {
            ...token,
            error: "GoogleSignInError"
          };
        }
      }

      if (user) {
        return {
          ...token,
          userId: user.id,
          name: user.name,
          email: user.email,
          plan: (user as any).plan,
          accessToken: (user as any).accessToken,
          refreshToken: (user as any).refreshToken,
          accessTokenExpires: (user as any).accessTokenExpires
        };
      }

      if (Date.now() < Number(token.accessTokenExpires ?? 0) - 10_000) {
        return token;
      }

      if (!token.refreshToken) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }: any) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          name: token.name as string,
          email: token.email as string,
          plan: token.plan as string
        },
        accessToken: token.accessToken as string,
        error: token.error as string | undefined
      };
    }
  }
});

export const handlers = nextAuth.handlers;
export const auth: typeof nextAuth.auth = nextAuth.auth;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
