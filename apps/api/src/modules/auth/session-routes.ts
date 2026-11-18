import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  registerAccountSchema,
} from "@nzila/shared";
import {
  loginWithPassword,
  registerAccount,
  requestOtp,
  verifyOtp,
} from "./session-service";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: loginSchema,
        tags: ["auth"],
        summary: "Entrar com email e palavra-passe",
      },
    },
    async (req) => loginWithPassword(app.db, req.body),
  );

  app.post(
    "/register",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: registerAccountSchema,
        tags: ["auth"],
        summary: "Criar conta de cliente",
      },
    },
    async (req, reply) => {
      const session = await registerAccount(app.db, req.body);
      return reply.code(201).send(session);
    },
  );

  app.post(
    "/logout",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["auth"],
        summary: "Terminar sessão",
        security: [{ bearer: [] }],
      },
    },
    async (_req, reply) => reply.code(204).send(),
  );

  app.post(
    "/otp/request",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: otpRequestSchema,
        tags: ["auth"],
        summary: "Pedir código de acesso por email",
      },
    },
    async (req) => requestOtp(app.db, req.body.email),
  );

  app.post(
    "/otp/verify",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: otpVerifySchema,
        tags: ["auth"],
        summary: "Validar código de acesso",
      },
    },
    async (req) => verifyOtp(app.db, req.body),
  );
};
