import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";
import { demoPrisma } from "../dev/demo-prisma";

declare global {
  // eslint-disable-next-line no-var
  var __blindspotPrisma__: PrismaClient | undefined;
}

const prisma =
  global.__blindspotPrisma__ ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__blindspotPrisma__ = prisma;
}

export default fp(async (fastify) => {
  const client = env.DEMO_MODE ? demoPrisma : prisma;

  fastify.decorate("prisma", client as any);

  fastify.addHook("onClose", async () => {
    await client.$disconnect();
  });
});
