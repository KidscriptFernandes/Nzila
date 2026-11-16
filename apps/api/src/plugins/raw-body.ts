import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

export const rawBodyPlugin = fp(async (app) => {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string", bodyLimit: 1_048_576 },
    (req, body, done) => {
      const text = typeof body === "string" ? body : body.toString("utf8");
      req.rawBody = text;
      try {
        done(null, text.length ? JSON.parse(text) : {});
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );
});
