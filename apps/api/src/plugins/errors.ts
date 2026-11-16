import fp from "fastify-plugin";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

export const errorsPlugin = fp(async (app) => {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.status).send({
        code: err.code,
        message: err.message,
        ...(err.meta ? { meta: err.meta } : {}),
        requestId: req.id,
      });
    }

    if (err instanceof ZodError) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        issues: err.issues,
        requestId: req.id,
      });
    }

    const validation = (err as { validation?: unknown }).validation;
    if (validation) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        issues: validation,
        requestId: req.id,
      });
    }

    const httpError = err as Error & { statusCode?: number; code?: string };
    if (httpError.statusCode && httpError.statusCode < 500) {
      return reply.status(httpError.statusCode).send({
        code: httpError.code ?? "ERROR",
        message: httpError.message,
        requestId: req.id,
      });
    }

    req.log.error({ err }, "erro não tratado");
    return reply.status(500).send({
      code: "INTERNAL",
      message: "Erro interno. Tenta novamente.",
      requestId: req.id,
    });
  });
});
