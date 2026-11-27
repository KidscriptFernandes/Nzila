import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type {
  AuthSessionDTO,
  GoogleAuthInput,
  LoginInput,
  OtpRequestResponse,
  OtpVerifyInput,
  RegisterAccountInput,
} from "@nzila/shared";
import type { DB } from "../../db/client";
import {
  authCredentials,
  authOtpCodes,
  clients,
  profiles,
} from "../../db/schema";
import { env } from "../../config/env";
import { AppError, Errors } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from "../../lib/sign-token";
import type { VerifiedToken } from "../../lib/verify-token";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

async function issueSession(
  db: DB,
  profileId: string,
  email: string,
): Promise<AuthSessionDTO> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile) throw Errors.unauthorized("Conta sem perfil Nzila");
  if (!profile.active) throw Errors.forbidden("Conta inativa");

  const { token, expiresAt } = await signAccessToken({
    id: profile.id,
    email,
    role: profile.role,
  });

  return {
    accessToken: token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: profile.id,
      email,
      role: profile.role,
      fullName: profile.fullName,
    },
  };
}

async function findCredential(db: DB, email: string) {
  const [row] = await db
    .select({
      profileId: authCredentials.profileId,
      email: authCredentials.email,
      passwordHash: authCredentials.passwordHash,
      active: profiles.active,
    })
    .from(authCredentials)
    .innerJoin(profiles, eq(profiles.id, authCredentials.profileId))
    .where(eq(authCredentials.email, email));
  return row;
}

export async function loginWithPassword(
  db: DB,
  input: LoginInput,
): Promise<AuthSessionDTO> {
  const credential = await findCredential(db, input.email);
  if (!credential) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email ou palavra-passe inválidos");
  }

  const valid = await verifyPassword(input.password, credential.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email ou palavra-passe inválidos");
  }

  if (!credential.active) throw Errors.forbidden("Conta inativa");

  return issueSession(db, credential.profileId, credential.email);
}

export async function registerAccount(
  db: DB,
  input: RegisterAccountInput,
): Promise<AuthSessionDTO> {
  const existing = await findCredential(db, input.email);
  if (existing) {
    throw Errors.conflict("EMAIL_TAKEN", "Este email já está registado");
  }

  const profileId = randomUUID();
  const passwordHash = await hashPassword(input.password);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: profileId,
        role: "client",
        fullName: input.fullName,
        whatsapp: input.whatsapp,
        locale: input.locale,
        consentAt: new Date(),
      });

      await tx.insert(clients).values({
        id: profileId,
        nationality: input.nationality ?? null,
        arrivalDate: input.arrivalDate ?? null,
        hotel: input.hotel ?? null,
      });

      await tx.insert(authCredentials).values({
        profileId,
        email: input.email,
        passwordHash,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw Errors.conflict("EMAIL_TAKEN", "Este email já está registado");
    }
    throw error;
  }

  return issueSession(db, profileId, input.email);
}

export async function requestOtp(
  db: DB,
  email: string,
): Promise<OtpRequestResponse> {
  const credential = await findCredential(db, email);
  if (!credential || !credential.active) {
    return { sent: true };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await db
    .insert(authOtpCodes)
    .values({
      email,
      codeHash: hashOtp(email, code),
      expiresAt,
      attempts: 0,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: authOtpCodes.email,
      set: {
        codeHash: hashOtp(email, code),
        expiresAt,
        attempts: 0,
        createdAt: now,
      },
    });

  return {
    sent: true,
    ...(env.NODE_ENV === "production" ? {} : { devCode: code }),
  };
}

export async function verifyOtp(
  db: DB,
  input: OtpVerifyInput,
): Promise<AuthSessionDTO> {
  const [row] = await db
    .select()
    .from(authOtpCodes)
    .where(eq(authOtpCodes.email, input.email));

  if (!row || row.expiresAt.getTime() < Date.now() || row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError(401, "OTP_INVALID", "Código inválido ou expirado");
  }

  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hashOtp(input.email, input.code), "hex");
  const valid = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!valid) {
    await db
      .update(authOtpCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(authOtpCodes.email, input.email));
    throw new AppError(401, "OTP_INVALID", "Código inválido ou expirado");
  }

  const credential = await findCredential(db, input.email);
  if (!credential) {
    throw new AppError(401, "OTP_INVALID", "Código inválido ou expirado");
  }
  if (!credential.active) throw Errors.forbidden("Conta inativa");

  await db.delete(authOtpCodes).where(eq(authOtpCodes.email, input.email));

  return issueSession(db, credential.profileId, credential.email);
}

export async function loginWithGoogle(
  db: DB,
  token: VerifiedToken,
  input: GoogleAuthInput,
): Promise<AuthSessionDTO> {
  const isGoogle =
    token.provider === "google" || Boolean(token.providers?.includes("google"));
  if (!isGoogle) {
    throw Errors.forbidden("Autenticação Google inválida");
  }

  const email = token.email?.trim().toLowerCase();
  if (!email) {
    throw Errors.unauthorized("Conta Google sem email");
  }

  if (token.emailVerified === false) {
    throw Errors.forbidden("Email Google não verificado");
  }

  const [existingById] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, token.id));

  if (existingById) {
    if (existingById.role === "client") {
      await db.insert(clients).values({ id: existingById.id }).onConflictDoNothing();
    }
    return issueSession(db, existingById.id, email);
  }

  const credential = await findCredential(db, email);
  if (credential) {
    if (token.emailVerified !== true) {
      throw Errors.conflict("EMAIL_TAKEN", "Este email já está registado");
    }
    return issueSession(db, credential.profileId, email);
  }

  const fallbackName = email.split("@")[0] || "Cliente Nzila";
  const fullName = (token.fullName?.trim() || fallbackName).slice(0, 120);

  await db.transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values({
        id: token.id,
        role: "client",
        fullName,
        whatsapp: "",
        locale: input.locale ?? "pt-AO",
        active: true,
        consentAt: new Date(),
      })
      .onConflictDoNothing();

    await tx.insert(clients).values({ id: token.id }).onConflictDoNothing();
  });

  return issueSession(db, token.id, email);
}

export const AUTH_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS;
