import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env";

type GoogleIdentity = {
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
};

let client: OAuth2Client | null = null;

const getGoogleClient = () => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error("Google OAuth is not configured");
  }

  if (!client) {
    client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  return client;
};

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleIdentity> => {
  const ticket = await getGoogleClient().verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new Error("Invalid Google identity payload");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? undefined,
    emailVerified: payload.email_verified ?? false
  };
};
