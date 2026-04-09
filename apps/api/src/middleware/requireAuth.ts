import type { FastifyReply, FastifyRequest } from "fastify";

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  await request.server.authenticate(request, reply);
};

