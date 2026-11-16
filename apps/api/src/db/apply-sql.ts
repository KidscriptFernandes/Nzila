import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

type Mode = "extras" | "rls" | "supabase";

const files: Record<Mode, string> = {
  extras: "extras.sql",
  rls: "rls.sql",
  supabase: "supabase.sql",
};

const mode = process.argv[2] as Mode | undefined;
if (!mode || !files[mode]) {
  console.error("Uso: tsx src/db/apply-sql.ts <extras|rls|supabase>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL em falta.");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined });

try {
  if (mode === "rls" || mode === "supabase") {
    const rows = await sql<{ present: boolean }[]>`
      select to_regclass('auth.users') is not null as present
    `;
    if (!rows[0]?.present) {
      console.warn(`[${mode}] schema auth ausente — script ignorado (não é um projeto Supabase).`);
      process.exit(0);
    }
  }

  const content = await readFile(path.join(here, "sql", files[mode]), "utf8");
  await sql.unsafe(content);
  console.log(`[${mode}] SQL aplicado com sucesso.`);
} finally {
  await sql.end({ timeout: 5 });
}
