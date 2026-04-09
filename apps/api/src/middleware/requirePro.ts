import type { FastifyReply, FastifyRequest } from "fastify";

export const requirePro = async (request: FastifyRequest, reply: FastifyReply) => {
  await request.server.authenticate(request, reply);

  if (request.user?.plan !== "PRO") {
    reply.code(403).send({ message: "Pro subscription required" });
  }
};
