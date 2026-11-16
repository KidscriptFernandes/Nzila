import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { desc, eq } from "drizzle-orm";
import {
  driverDocumentUploadSchema,
  type DriverDocumentDTO,
} from "@nzila/shared";
import { driverDocuments, drivers } from "../../db/schema";
import { AppError, Errors } from "../../lib/errors";
import {
  DRIVER_DOCS_BUCKET,
  supabaseAdmin,
} from "../../lib/supabase-admin";
import { getMe } from "../auth/service";

function toDocumentDto(row: typeof driverDocuments.$inferSelect): DriverDocumentDTO {
  return {
    id: row.id,
    type: row.type,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function safeFilename(filename: string): string {
  const cleaned = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "documento";
}

export const driversRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/me",
    {
      preHandler: app.requireRole("driver"),
      schema: {
        tags: ["drivers"],
        summary: "Estado de verificação do motorista",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const me = await getMe(app.db, req.user!.id);
      return { driver: me.driver };
    },
  );

  app.get(
    "/me/documents",
    {
      preHandler: app.requireRole("driver"),
      schema: {
        tags: ["drivers"],
        summary: "Documentos submetidos",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const rows = await app.db
        .select()
        .from(driverDocuments)
        .where(eq(driverDocuments.driverId, req.user!.id))
        .orderBy(desc(driverDocuments.createdAt));

      return { items: rows.map(toDocumentDto) };
    },
  );

  app.post(
    "/me/documents",
    {
      preHandler: app.requireRole("driver"),
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
      schema: {
        body: driverDocumentUploadSchema,
        tags: ["drivers"],
        summary: "Gera URL assinada para upload de documento",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const driverId = req.user!.id;

      const [driver] = await app.db
        .select({ id: drivers.id })
        .from(drivers)
        .where(eq(drivers.id, driverId));
      if (!driver) throw Errors.notFound("Motorista");

      const path = `${driverId}/${req.body.type}/${Date.now()}-${safeFilename(req.body.filename)}`;

      const { data, error } = await supabaseAdmin.storage
        .from(DRIVER_DOCS_BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data) {
        throw new AppError(502, "STORAGE_ERROR", "Não foi possível preparar o upload");
      }

      const [document] = await app.db
        .insert(driverDocuments)
        .values({
          driverId,
          type: req.body.type,
          storagePath: path,
          contentType: req.body.contentType,
          sizeBytes: req.body.sizeBytes,
          expiresAt: req.body.expiresAt ?? null,
        })
        .returning();

      if (!document) throw new Error("Falha ao registar documento");

      return reply.code(201).send({
        uploadUrl: data.signedUrl,
        token: data.token,
        path,
        document: toDocumentDto(document),
      });
    },
  );
};
