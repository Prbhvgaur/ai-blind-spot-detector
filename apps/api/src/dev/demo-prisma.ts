import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

type Plan = "FREE" | "PRO";
type AnalysisStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";

type DemoUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  plan: Plan;
  analysisCount: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
};

type DemoRefreshToken = {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};

type DemoAnalysis = {
  id: string;
  userId: string;
  createdAt: Date;
  input: string;
  status: AnalysisStatus;
  counterarguments: unknown;
  assumptions: unknown;
  expertPersonas: unknown;
  blindSpotReport: unknown;
  confidenceAudit: unknown;
  summary: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  isPublic: boolean;
  shareToken: string | null;
};

type DemoState = {
  users: DemoUser[];
  refreshTokens: DemoRefreshToken[];
  analyses: DemoAnalysis[];
};

const dataFile = path.resolve(__dirname, "../../.data/demo-db.json");

const createDefaultState = (): DemoState => ({
  users: [],
  refreshTokens: [],
  analyses: []
});

const ensureDataFile = () => {
  const directory = path.dirname(dataFile);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(createDefaultState(), null, 2));
  }
};

const deserializeState = (raw: string): DemoState => {
  const parsed = JSON.parse(raw) as {
    users: Array<
      Omit<DemoUser, "createdAt" | "updatedAt" | "subscriptionEndsAt"> & {
      createdAt: string;
      updatedAt: string;
      subscriptionEndsAt: string | null;
      }
    >;
    refreshTokens: Array<Omit<DemoRefreshToken, "createdAt" | "expiresAt"> & {
      createdAt: string;
      expiresAt: string;
    }>;
    analyses: Array<Omit<DemoAnalysis, "createdAt"> & { createdAt: string }>;
  };

  return {
    users: parsed.users.map((user) => ({
      ...user,
      passwordHash: user.passwordHash ?? null,
      googleId: user.googleId ?? null,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      subscriptionEndsAt: user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null
    })),
    refreshTokens: parsed.refreshTokens.map((token) => ({
      ...token,
      createdAt: new Date(token.createdAt),
      expiresAt: new Date(token.expiresAt)
    })),
    analyses: parsed.analyses.map((analysis) => ({
      ...analysis,
      createdAt: new Date(analysis.createdAt)
    }))
  };
};

const snapshot = <T>(value: T): T => structuredClone(value);

class DemoPrismaClient {
  private state: DemoState | null = null;

  private loadState() {
    if (!this.state) {
      ensureDataFile();
      this.state = deserializeState(fs.readFileSync(dataFile, "utf8"));
    }

    return this.state;
  }

  private saveState() {
    if (!this.state) {
      return;
    }

    fs.writeFileSync(dataFile, JSON.stringify(this.state, null, 2));
  }

  private touchUser(user: DemoUser) {
    user.updatedAt = new Date();
  }

  user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string; googleId?: string } }) => {
      const state = this.loadState();
      const user = state.users.find((item) =>
        where.id
          ? item.id === where.id
          : where.email
            ? item.email === where.email
            : where.googleId
              ? item.googleId === where.googleId
              : false
      );

      return user ? snapshot(user) : null;
    },
    findUniqueOrThrow: async ({
      where
    }: {
      where: { id?: string; email?: string; googleId?: string };
    }) => {
      const user = await this.user.findUnique({ where });

      if (!user) {
        throw new Error("Record not found");
      }

      return user;
    },
    findFirst: async ({ where }: { where: { stripeCustomerId?: string; stripeSubscriptionId?: string } }) => {
      const state = this.loadState();
      const user = state.users.find((item) =>
        where.stripeCustomerId
          ? item.stripeCustomerId === where.stripeCustomerId
          : where.stripeSubscriptionId
            ? item.stripeSubscriptionId === where.stripeSubscriptionId
            : false
      );

      return user ? snapshot(user) : null;
    },
    create: async ({
      data
    }: {
      data: {
        email: string;
        passwordHash?: string | null;
        googleId?: string | null;
        name: string | null;
      };
    }) => {
      const state = this.loadState();
      const now = new Date();
      const created: DemoUser = {
        id: randomUUID(),
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        googleId: data.googleId ?? null,
        name: data.name,
        createdAt: now,
        updatedAt: now,
        plan: "FREE",
        analysisCount: 0,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        subscriptionEndsAt: null
      };

      state.users.push(created);
      this.saveState();
      return snapshot(created);
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<DemoUser> }) => {
      const state = this.loadState();
      const user = state.users.find((item) => item.id === where.id);

      if (!user) {
        throw new Error("Record not found");
      }

      Object.assign(user, data);
      this.touchUser(user);
      this.saveState();
      return snapshot(user);
    }
  };

  refreshToken = {
    create: async ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
      const state = this.loadState();
      const created: DemoRefreshToken = {
        id: randomUUID(),
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        createdAt: new Date()
      };

      state.refreshTokens.push(created);
      this.saveState();
      return snapshot(created);
    },
    findUnique: async ({
      where,
      include
    }: {
      where: { token: string };
      include?: { user?: boolean };
    }) => {
      const state = this.loadState();
      const token = state.refreshTokens.find((item) => item.token === where.token);

      if (!token) {
        return null;
      }

      if (!include?.user) {
        return snapshot(token);
      }

      const user = state.users.find((item) => item.id === token.userId);

      return user
        ? snapshot({
            ...token,
            user
          })
        : null;
    },
    delete: async ({ where }: { where: { token: string } }) => {
      const state = this.loadState();
      const index = state.refreshTokens.findIndex((item) => item.token === where.token);

      if (index < 0) {
        throw new Error("Record not found");
      }

      const [removed] = state.refreshTokens.splice(index, 1);
      this.saveState();
      return snapshot(removed);
    },
    deleteMany: async ({ where }: { where: { token: string } }) => {
      const state = this.loadState();
      const before = state.refreshTokens.length;
      state.refreshTokens = state.refreshTokens.filter((item) => item.token !== where.token);
      this.saveState();

      return {
        count: before - state.refreshTokens.length
      };
    }
  };

  analysis = {
    create: async ({ data }: { data: { userId: string; input: string; status: AnalysisStatus } }) => {
      const state = this.loadState();
      const created: DemoAnalysis = {
        id: randomUUID(),
        userId: data.userId,
        createdAt: new Date(),
        input: data.input,
        status: data.status,
        counterarguments: null,
        assumptions: null,
        expertPersonas: null,
        blindSpotReport: null,
        confidenceAudit: null,
        summary: null,
        inputTokens: null,
        outputTokens: null,
        durationMs: null,
        isPublic: false,
        shareToken: null
      };

      state.analyses.push(created);
      this.saveState();
      return snapshot(created);
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const state = this.loadState();
      const analysis = state.analyses.find((item) => item.id === where.id);
      return analysis ? snapshot(analysis) : null;
    },
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const analysis = await this.analysis.findUnique({ where });

      if (!analysis) {
        throw new Error("Record not found");
      }

      return analysis;
    },
    findFirstOrThrow: async ({ where }: { where: { id: string; userId: string } }) => {
      const state = this.loadState();
      const analysis = state.analyses.find((item) => item.id === where.id && item.userId === where.userId);

      if (!analysis) {
        throw new Error("Record not found");
      }

      return snapshot(analysis);
    },
    findMany: async ({
      where,
      orderBy,
      skip = 0,
      take
    }: {
      where?: { userId?: string };
      orderBy?: { createdAt: "asc" | "desc" };
      skip?: number;
      take?: number;
    }) => {
      const state = this.loadState();
      let analyses = [...state.analyses];

      if (where?.userId) {
        analyses = analyses.filter((item) => item.userId === where.userId);
      }

      if (orderBy?.createdAt) {
        analyses.sort((left, right) =>
          orderBy.createdAt === "desc"
            ? right.createdAt.getTime() - left.createdAt.getTime()
            : left.createdAt.getTime() - right.createdAt.getTime()
        );
      }

      return snapshot(analyses.slice(skip, take ? skip + take : undefined));
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<DemoAnalysis> }) => {
      const state = this.loadState();
      const analysis = state.analyses.find((item) => item.id === where.id);

      if (!analysis) {
        throw new Error("Record not found");
      }

      Object.assign(analysis, data);
      this.saveState();
      return snapshot(analysis);
    },
    count: async ({
      where
    }: {
      where?: {
        userId?: string;
        status?: AnalysisStatus;
        input?: { not?: string };
      };
    }) =>
      this.loadState().analyses.filter((item) => {
        if (where?.userId && item.userId !== where.userId) {
          return false;
        }

        if (where?.status && item.status !== where.status) {
          return false;
        }

        if (where?.input?.not && item.input === where.input.not) {
          return false;
        }

        return true;
      }).length
  };

  async $disconnect() {
    return;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __blindspotDemoPrisma__: DemoPrismaClient | undefined;
}

export const demoPrisma = global.__blindspotDemoPrisma__ ?? new DemoPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__blindspotDemoPrisma__ = demoPrisma;
}
