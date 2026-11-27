import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe("API pública", () => {
  it("responde ao health check", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "nzila-api" });
  });

  it("exige autenticação nas rotas privadas", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/places" });
    expect(response.statusCode).toBe(401);
  });

  it("rejeita tokens inválidos", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: "Bearer not-a-token" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("exige token válido na autenticação Google", async () => {
    const missing = await app.inject({
      method: "POST",
      url: "/v1/auth/google",
      payload: {},
    });
    expect(missing.statusCode).toBe(401);

    const invalid = await app.inject({
      method: "POST",
      url: "/v1/auth/google",
      headers: { authorization: "Bearer not-a-token" },
      payload: {},
    });
    expect(invalid.statusCode).toBe(401);
  });

  it("devolve 404 com código padronizado", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/does-not-exist" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("webhook WhatsApp", () => {
  it("valida o token de verificação da Meta", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-whatsapp-verify-token&hub.challenge=abc123",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("abc123");
  });

  it("rejeita assinaturas HMAC inválidas", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=deadbeef",
      },
      payload: JSON.stringify({ entry: [] }),
    });
    expect(response.statusCode).toBe(401);
  });

  it("aceita payload assinado corretamente", async () => {
    const payload = JSON.stringify({ entry: [{ changes: [] }] });
    const signature = createHmac("sha256", "test-whatsapp-app-secret")
      .update(payload)
      .digest("hex");

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${signature}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
  });
});

describe("rate limit", () => {
  it("limita tentativas em rotas inexistentes", async () => {
    const rates = [];
    for (let index = 0; index < 22; index += 1) {
      const response = await app.inject({ method: "GET", url: `/nao-existe-${index}` });
      rates.push(response.statusCode);
    }
    expect(rates.filter((status) => status === 429).length).toBeGreaterThan(0);
  });
});
