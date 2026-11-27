import { SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";
import type { DB } from "../../db/client";
import { AppError } from "../../lib/errors";
import { verifyAccessToken } from "../../lib/verify-token";
import { loginWithGoogle } from "./session-service";

async function signTestSupabaseToken(claims: Record<string, unknown>) {
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("11111111-1111-4111-8111-111111111111")
    .setIssuer(`${process.env.SUPABASE_URL}/auth/v1`)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

function createFakeDb(options: {
  profileById?: { id: string; role: "client" | "driver" | "assistant" | "admin"; fullName: string; active: boolean } | null;
  credentialByEmail?: { profileId: string; email: string; passwordHash: string; active: boolean } | null;
  skipFirstProfileLookup?: boolean;
}) {
  let storedProfile = options.profileById ?? null;
  let remainingProfileSkips = options.skipFirstProfileLookup ? 1 : 0;
  let lastCall: "profile" | "credential" = "profile";
  let selectCount = 0;

  const makeSelectChain = () => {
    const chain = {
      from: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      where: vi.fn(async () => {
        if (lastCall === "credential") {
          return options.credentialByEmail ? [options.credentialByEmail] : [];
        }
        if (remainingProfileSkips > 0) {
          remainingProfileSkips -= 1;
          return [];
        }
        return storedProfile ? [storedProfile] : [];
      }),
    };
    return chain;
  };

  const insertChain = {
    values: vi.fn((vals: Record<string, unknown>) => {
      if ("fullName" in vals && "role" in vals) {
        storedProfile = {
          id: String(vals.id),
          role: vals.role as "client",
          fullName: String(vals.fullName),
          active: true,
        };
      }
      return {
        onConflictDoNothing: vi.fn(async () => undefined),
      };
    }),
  };

  const db = {
    select: vi.fn((fields?: unknown) => {
      selectCount += 1;
      lastCall = fields ? "credential" : "profile";
      return makeSelectChain();
    }),
    insert: vi.fn(() => insertChain),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ insert: vi.fn(() => insertChain) });
    }),
  };

  return { db: db as unknown as DB, getSelectCount: () => selectCount };
}

describe("verifyAccessToken", () => {
  it("extrai metadados de utilizador Google de tokens Supabase", async () => {
    const token = await signTestSupabaseToken({
      email: "ana@gmail.com",
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: { full_name: "Ana Silva", email_verified: true },
    });

    const verified = await verifyAccessToken(token);
    expect(verified).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      email: "ana@gmail.com",
      fullName: "Ana Silva",
      provider: "google",
      providers: ["google"],
      emailVerified: true,
    });
  });
});

describe("loginWithGoogle", () => {
  it("rejeita tokens que não são do provedor Google", async () => {
    const { db } = createFakeDb({});
    await expect(
      loginWithGoogle(
        db,
        {
          id: "11111111-1111-4111-8111-111111111111",
          email: "ana@gmail.com",
          provider: "email",
          emailVerified: true,
        },
        {},
      ),
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<AppError>);
  });

  it("rejeita contas Google com email não verificado", async () => {
    const { db } = createFakeDb({});
    await expect(
      loginWithGoogle(
        db,
        {
          id: "11111111-1111-4111-8111-111111111111",
          email: "ana@gmail.com",
          provider: "google",
          emailVerified: false,
        },
        {},
      ),
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<AppError>);
  });

  it("cria perfil de cliente e emite sessão para novo utilizador Google", async () => {
    const { db } = createFakeDb({});
    const session = await loginWithGoogle(
      db,
      {
        id: "11111111-1111-4111-8111-111111111111",
        email: "Ana@Gmail.com",
        fullName: "Ana Silva",
        provider: "google",
        emailVerified: true,
      },
      { locale: "en" },
    );

    expect(session.accessToken).toBeTruthy();
    expect(session.user).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      email: "ana@gmail.com",
      role: "client",
      fullName: "Ana Silva",
    });

    const verifiedSessionToken = await verifyAccessToken(session.accessToken);
    expect(verifiedSessionToken.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("associa conta local existente quando o email Google está verificado", async () => {
    const { db } = createFakeDb({
      profileById: {
        id: "22222222-2222-4222-8222-222222222222",
        role: "client",
        fullName: "Ana Local",
        active: true,
      },
      credentialByEmail: {
        profileId: "22222222-2222-4222-8222-222222222222",
        email: "ana@gmail.com",
        passwordHash: "hash",
        active: true,
      },
      skipFirstProfileLookup: true,
    });

    const session = await loginWithGoogle(
      db,
      {
        id: "11111111-1111-4111-8111-111111111111",
        email: "ana@gmail.com",
        provider: "google",
        emailVerified: true,
      },
      {},
    );

    expect(session.user.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(session.user.fullName).toBe("Ana Local");
  });
});
