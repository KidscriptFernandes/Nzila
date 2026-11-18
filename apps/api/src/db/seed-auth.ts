import "dotenv/config";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDb, db } from "./client";
import { authCredentials, profiles } from "./schema";
import { hashPassword } from "../lib/password";

const DEMO_PASSWORD = "Nzila!Demo2026";
const DEMO_EMAILS = [
  "admin@nzila.ao",
  "assistente1@nzila.ao",
  "assistente2@nzila.ao",
  "cliente1@nzila.ao",
  "cliente2@nzila.ao",
  "motorista1@nzila.ao",
  "motorista2@nzila.ao",
  "motorista3@nzila.ao",
];

const ADMIN = {
  email: process.env.ADMIN_SEED_EMAIL,
  password: process.env.ADMIN_SEED_PASSWORD,
  fullName: process.env.ADMIN_SEED_NAME ?? "Administrador Nzila",
  whatsapp: process.env.ADMIN_SEED_WHATSAPP ?? "+244923000000",
};

function localUserId(email: string): string {
  const hash = createHash("sha1").update(email.toLowerCase()).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function setCredential(email: string, password: string): Promise<void> {
  const profileId = localUserId(email);
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, profileId));

  if (!profile) {
    console.log(`[skip] ${email}: perfil não encontrado`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await db
    .insert(authCredentials)
    .values({ profileId, email, passwordHash })
    .onConflictDoUpdate({
      target: authCredentials.profileId,
      set: { email, passwordHash, updatedAt: new Date() },
    });

  console.log(`[ok] ${email}`);
}

async function ensureAdmin(): Promise<void> {
  if (!ADMIN.email || !ADMIN.password) {
    console.log("[skip] administrador: define ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD");
    return;
  }

  const profileId = localUserId(ADMIN.email);

  await db
    .insert(profiles)
    .values({
      id: profileId,
      role: "admin",
      fullName: ADMIN.fullName,
      whatsapp: ADMIN.whatsapp,
      locale: "pt-AO",
      active: true,
      consentAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        role: "admin",
        fullName: ADMIN.fullName,
        whatsapp: ADMIN.whatsapp,
        locale: "pt-AO",
        active: true,
      },
    });

  await setCredential(ADMIN.email, ADMIN.password);
}

async function main(): Promise<void> {
  for (const email of DEMO_EMAILS) {
    await setCredential(email, DEMO_PASSWORD);
  }

  await ensureAdmin();

  console.log("");
  console.log("Credenciais de demonstração (palavra-passe: %s):", DEMO_PASSWORD);
  console.log("  admin@nzila.ao");
  console.log("  cliente1@nzila.ao");
  console.log("  motorista1@nzila.ao");
  console.log("");
  if (ADMIN.email) {
    console.log("Administrador: %s", ADMIN.email);
  }
}

main()
  .catch((error) => {
    console.error("Falha ao criar credenciais:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
