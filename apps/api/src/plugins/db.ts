import fp from "fastify-plugin";
import { db, closeDb, type DB } from "../db/client";

declare module "fastify" {
  interface FastifyInstance {
    db: DB;
  }
}

export const dbPlugin = fp(async (app) => {
  app.decorate("db", db);
  app.addHook("onClose", async () => {
    await closeDb();
  });
});
