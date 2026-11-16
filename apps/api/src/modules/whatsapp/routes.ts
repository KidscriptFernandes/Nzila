import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../../config/env";

interface WhatsAppWebhook {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

export const whatsappRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const mode = query["hub.mode"];
      const token = query["hub.verify_token"];
      const challenge = query["hub.challenge"];

      if (
        mode === "subscribe" &&
        env.WHATSAPP_VERIFY_TOKEN &&
        token === env.WHATSAPP_VERIFY_TOKEN &&
        challenge
      ) {
        return reply.type("text/plain").send(challenge);
      }

      return reply.forbidden("Verificação inválida");
    },
  );

  app.post(
    "/",
    { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const secret = env.WHATSAPP_APP_SECRET;
      if (!secret) {
        return reply.code(503).send({
          code: "WHATSAPP_NOT_CONFIGURED",
          message: "Webhook WhatsApp não configurado",
        });
      }

      const header = req.headers["x-hub-signature-256"];
      const signature = typeof header === "string" ? header.replace("sha256=", "") : "";
      const raw = req.rawBody ?? JSON.stringify(req.body ?? {});
      const expected = createHmac("sha256", secret).update(raw).digest("hex");

      const provided = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expected, "hex");

      if (
        provided.length === 0 ||
        provided.length !== expectedBuffer.length ||
        !timingSafeEqual(provided, expectedBuffer)
      ) {
        return reply.unauthorized("Assinatura inválida");
      }

      const payload = req.body as WhatsAppWebhook;
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          for (const message of change.value?.messages ?? []) {
            req.log.info(
              {
                from: message.from,
                type: message.type,
                text: message.text?.body,
                phoneNumberId: change.value?.metadata?.phone_number_id,
              },
              "whatsapp.message",
            );
          }
        }
      }

      return reply.code(200).send({ received: true });
    },
  );
};
