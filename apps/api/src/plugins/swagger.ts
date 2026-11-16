import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { isProd } from "../config/env";

export const swaggerPlugin = fp(async (app) => {
  if (isProd) return;

  await app.register(swagger, {
    openapi: {
      info: { title: "Nzila API", version: "1.0.0" },
      components: {
        securitySchemes: {
          bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });
});
