import { buildApp } from "./app";
import { env } from "./config/env";

const app = await buildApp();

async function shutdown(signal: string) {
  app.log.info({ signal }, "a encerrar");
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "erro ao encerrar");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error({ err: error }, "falha ao arrancar");
  process.exit(1);
}
