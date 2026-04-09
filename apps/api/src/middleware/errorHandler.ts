import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { logger } from "../lib/logger";

export const errorHandler = (
  error: FastifyError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  logger.error(
    {
      err: error,
      method: request.method,
      url: request.url
    },
    "Unhandled request error"
  );

  if (error instanceof ZodError) {
    reply.code(400).send({
      message: "Validation failed",
      issues: error.flatten()
    });
    return;
  }

  if ("validation" in error && error.validation) {
    reply.code(400).send({
      message: "Validation failed",
      issues: error.validation
    });
    return;
  }

  const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
  reply.code(statusCode).send({
    message: statusCode >= 500 ? "Internal server error" : error.message
  });
};

