import fp from "fastify-plugin";
import cors from "@fastify/cors";

import { env } from "../config/env";

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: env.NEXTAUTH_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  });
});

