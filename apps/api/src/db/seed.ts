import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { db, closeDb } from "./client";
import {
  clients,
  drivers,
  placeMessages,
  places,
  profiles,
  ratings,
  rideEvents,
  rides,
  vehicles,
} from "./schema";
import { supabaseAdmin } from "../lib/supabase-admin";
import { DEFAULT_CANCELLATION_POLICY } from "@nzila/shared";

const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? randomUUID();
const LOCAL_SEED = process.env.SEED_LOCAL === "1";
const TOMORROW = new Date(Date.now() + 24 * 60 * 60 * 1000);
const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000);

function at(base: Date, hour: number, minute = 0): Date {
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function findUserByEmail(email: string): Promise<User | undefined> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
}

function localUserId(email: string): string {
  const hash = createHash("sha1").update(email.toLowerCase()).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function ensureUser(email: string, metadata: Record<string, string>): Promise<string> {
  if (LOCAL_SEED) return localUserId(email);

  const existing = await findUserByEmail(email);
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    const retry = await findUserByEmail(email);
    if (retry) return retry.id;
    throw new Error(`Falha ao criar ${email}: ${error?.message ?? "erro desconhecido"}`);
  }

  return data.user.id;
}

async function nextDriverCode(): Promise<string> {
  const rows = await db.execute<{ code: string }>(sql`
    select 'NZ-M' || lpad(nextval('driver_code_seq')::text, 3, '0') as code
  `);
  const code = rows[0]?.code;
  if (!code) throw new Error("Sequência driver_code_seq em falta. Corre pnpm db:extras.");
  return code;
}

async function nextRideReference(): Promise<string> {
  const rows = await db.execute<{ ref: string }>(sql`
    select 'NZ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ride_ref_seq')::text, 6, '0') as ref
  `);
  const ref = rows[0]?.ref;
  if (!ref) throw new Error("Sequência ride_ref_seq em falta. Corre pnpm db:extras.");
  return ref;
}

async function seedUser(input: {
  email: string;
  role: "client" | "driver" | "assistant" | "admin";
  fullName: string;
  whatsapp: string;
  locale?: string;
}): Promise<string> {
  const id = await ensureUser(input.email, {
    full_name: input.fullName,
    whatsapp: input.whatsapp,
    locale: input.locale ?? "pt-AO",
    consent: "true",
  });

  await db
    .insert(profiles)
    .values({
      id,
      role: input.role,
      fullName: input.fullName,
      whatsapp: input.whatsapp,
      locale: input.locale ?? "pt-AO",
      consentAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        role: input.role,
        fullName: input.fullName,
        whatsapp: input.whatsapp,
        locale: input.locale ?? "pt-AO",
        consentAt: new Date(),
      },
    });

  return id;
}

async function seedDrivers(
  clientIds: string[],
): Promise<{ driverId: string; vehicleId: string }[]> {
  void clientIds;
  const result: { driverId: string; vehicleId: string }[] = [];

  const driverData = [
    {
      email: "motorista1@nzila.ao",
      fullName: "Mateus Kiala",
      whatsapp: "+244923000101",
      verification: "VERIFICADO" as const,
      make: "Toyota",
      model: "Corolla",
      color: "Prata",
      plate: "LD-01-23-AA",
      seats: 4,
      zones: ["Ingombota", "Maianga", "Talatona"],
    },
    {
      email: "motorista2@nzila.ao",
      fullName: "Ana Domingos",
      whatsapp: "+244923000102",
      verification: "VERIFICADO" as const,
      make: "Hyundai",
      model: "Tucson",
      color: "Branco",
      plate: "LD-45-67-BB",
      seats: 5,
      zones: ["Talatona", "Belas", "Kilamba"],
    },
    {
      email: "motorista3@nzila.ao",
      fullName: "Paulo Nzinga",
      whatsapp: "+244923000103",
      verification: "EM_VERIFICACAO" as const,
      make: "Kia",
      model: "Sportage",
      color: "Cinza",
      plate: "LD-89-01-CC",
      seats: 5,
      zones: ["Cacuaco", "Viana"],
    },
  ];

  for (const driver of driverData) {
    const id = await seedUser({
      email: driver.email,
      role: "driver",
      fullName: driver.fullName,
      whatsapp: driver.whatsapp,
    });

    await db.delete(clients).where(eq(clients.id, id));

    let [driverRow] = await db.select().from(drivers).where(eq(drivers.id, id));
    if (!driverRow) {
      const code = await nextDriverCode();
      [driverRow] = await db
        .insert(drivers)
        .values({
          id,
          code,
          verification: driver.verification,
          verifiedAt: driver.verification === "VERIFICADO" ? new Date() : null,
          zones: driver.zones,
        })
        .returning();
    } else if (driverRow.verification !== driver.verification) {
      [driverRow] = await db
        .update(drivers)
        .set({
          verification: driver.verification,
          verifiedAt: driver.verification === "VERIFICADO" ? new Date() : null,
        })
        .where(eq(drivers.id, id))
        .returning();
    }

    let [vehicle] = await db.select().from(vehicles).where(eq(vehicles.driverId, id));
    if (!vehicle) {
      [vehicle] = await db
        .insert(vehicles)
        .values({
          driverId: id,
          make: driver.make,
          model: driver.model,
          color: driver.color,
          plate: driver.plate,
          seats: driver.seats,
        })
        .returning();
    }

    if (driverRow && vehicle) {
      result.push({ driverId: driverRow.id, vehicleId: vehicle.id });
    }
  }

  return result;
}

async function seedPlaces(): Promise<void> {
  const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(places);
  if (Number(row?.value ?? 0) > 0) return;

  const locations = [
    [
      "Aeroporto Internacional 4 de Fevereiro",
      "AEROPORTO",
      -8.8583,
      13.2312,
      "Aeroporto histórico de Luanda, na zona do Cassequel.",
    ],
    [
      "Aeroporto Dr. António Agostinho Neto",
      "AEROPORTO",
      -9.0456,
      13.4932,
      "Novo aeroporto internacional, em Icolo e Bengo (Bom Jesus).",
    ],
    [
      "Epic Sana Luanda Hotel",
      "HOTEL",
      -8.8131,
      13.2293,
      "Hotel de referência na Marginal de Luanda.",
    ],
    [
      "Talatona Convention Hotel",
      "HOTEL",
      -8.9147,
      13.1847,
      "Hotel e centro de conferências em Talatona.",
    ],
    ["Hotel Presidente", "HOTEL", -8.8181, 13.2325, "Hotel central na baixa de Luanda."],
    ["Hotel Trópico", "HOTEL", -8.8167, 13.2327, "Hotel clássico perto da Marginal."],
    [
      "Clínica Sagrada Esperança",
      "HOSPITAL",
      -8.8153,
      13.2306,
      "Clínica privada com urgências e especialidades.",
    ],
    ["Hospital Girassol", "HOSPITAL", -8.8262, 13.2237, "Hospital privado na zona do Maculusso."],
    [
      "Hospital Américo Boavida",
      "HOSPITAL",
      -8.8225,
      13.24,
      "Hospital público de referência em Luanda.",
    ],
    [
      "Hospital Josina Machel",
      "HOSPITAL",
      -8.8175,
      13.2368,
      "Hospital público na baixa de Luanda.",
    ],
    [
      "Farmácia Sagrada Esperança",
      "FARMACIA",
      -8.8152,
      13.2311,
      "Farmácia junto à clínica com o mesmo nome.",
    ],
    [
      "Farmácia Popular de Luanda",
      "FARMACIA",
      -8.8201,
      13.2338,
      "Farmácia central com horário alargado.",
    ],
    ["Farmácia Talatona", "FARMACIA", -8.9135, 13.1862, "Farmácia de bairro em Talatona."],
    ["Banco BAI — Ingombota", "BANCO", -8.8172, 13.2315, "Balcão BAI na baixa de Luanda."],
    ["Banco BFA — Marginal", "BANCO", -8.8143, 13.2322, "Balcão BFA junto à Marginal."],
    ["Banco BIC — Talatona", "BANCO", -8.9151, 13.1851, "Balcão BIC em Talatona."],
    ["Standard Bank — Luanda", "BANCO", -8.8188, 13.2341, "Balcão Standard Bank na baixa."],
    ["Banco Atlântico — Maianga", "BANCO", -8.8259, 13.2288, "Balcão Banco Atlântico na Maianga."],
    ["ATM BAI — Marginal", "ATM", -8.8146, 13.2329, "Caixa Multicaixa junto à Marginal."],
    ["ATM BFA — Talatona", "ATM", -8.9144, 13.1856, "Caixa Multicaixa em Talatona."],
    ["ATM BIC — Aeroporto", "ATM", -8.8577, 13.2321, "Caixa Multicaixa nas chegadas do aeroporto."],
    [
      "Fortaleza de São Miguel",
      "ATRACAO",
      -8.8128,
      13.2299,
      "Fortaleza histórica com vista sobre a baía de Luanda.",
    ],
    ["Miradouro da Lua", "ATRACAO", -9.2333, 13.1167, "Falésias espetaculares a sul de Luanda."],
    ["Ilha de Luanda", "ATRACAO", -8.8, 13.2333, "Restaurantes, praia e passeios na Ilha."],
    [
      "Museu Nacional de Antropologia",
      "ATRACAO",
      -8.815,
      13.23,
      "Coleções sobre a história e cultura de Angola.",
    ],
    [
      "Palácio de Ferro",
      "ATRACAO",
      -8.814,
      13.233,
      "Edifício histórico atribuído a Gustave Eiffel.",
    ],
    [
      "Restaurante Fortaleza",
      "RESTAURANTE",
      -8.8129,
      13.2297,
      "Cozinha angolana e internacional junto à Fortaleza.",
    ],
    ["Lookal Mar", "RESTAURANTE", -8.8015, 13.2358, "Frutos do mar na Ilha de Luanda."],
    ["Cais Quatro", "RESTAURANTE", -8.8158, 13.2345, "Restaurante e bar na Marginal."],
    ["Oon.dah", "RESTAURANTE", -8.8137, 13.2324, "Cozinha contemporânea na baixa de Luanda."],
  ] as const;

  await db.insert(places).values(
    locations.map(([name, category, lat, lng, description]) => ({
      name,
      category,
      lat,
      lng,
      description,
      address: "Luanda, Angola",
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      published: true,
    })),
  );
}

async function seedPlaceMessages(authorIds: string[]): Promise<void> {
  if (!authorIds.length) return;

  const rows = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.published, true))
    .orderBy(asc(places.name))
    .limit(6);

  const opinions = [
    "Cheguei há pouco. O mais fácil é vir de motorista e combinar o ponto de encontro à entrada principal.",
    "Evita as horas de ponta (07:30–09:00 e 17:00–19:00). O trânsito fica complicado e a viagem demora o dobro.",
    "Leva kwanzas em dinheiro. Nem todos os multicaixas da zona estão a funcionar.",
    "Se fores de noite, pede para te deixarem na entrada com iluminação e segue sempre pelas ruas principais.",
    "A zona é movimentada durante o dia. Mantém os pertences por perto e pergunta ao pessoal do local como seguir.",
    "Diz ao motorista o nome exato do local, não só a rua. Ajuda muito a chegar sem voltas.",
  ];

  for (const [index, place] of rows.entries()) {
    const [existing] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(placeMessages)
      .where(eq(placeMessages.placeId, place.id));
    if (Number(existing?.value ?? 0) > 0) continue;

    await db.insert(placeMessages).values({
      placeId: place.id,
      authorId: authorIds[index % authorIds.length]!,
      body: opinions[index % opinions.length]!,
    });
  }
}

async function seedSampleRides(
  clientIds: string[],
  driverRefs: { driverId: string; vehicleId: string }[],
  assistantId: string,
): Promise<void> {
  const primaryClient = clientIds[0];
  if (!primaryClient) return;

  const [existing] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(rides)
    .where(eq(rides.clientId, primaryClient));
  if (Number(existing?.value ?? 0) > 0) return;

  const reference1 = await nextRideReference();
  const [ride1] = await db
    .insert(rides)
    .values({
      reference: reference1,
      clientId: primaryClient,
      customerName: "Sofia Mendes",
      customerPhone: "+244923000001",
      origin: "Aeroporto Internacional 4 de Fevereiro",
      destination: "Epic Sana Luanda Hotel",
      scheduledAt: at(TOMORROW, 10),
      passengers: 2,
      luggage: 2,
      notes: "Chegada de voo internacional. Motorista deve estar à saída.",
      priority: "NORMAL",
      status: "NOVO",
    })
    .returning();

  if (ride1) {
    await db.insert(rideEvents).values({
      rideId: ride1.id,
      toStatus: "NOVO",
      actorId: primaryClient,
      actorRole: "client",
    });
  }

  const verified = driverRefs[0];
  const reference2 = await nextRideReference();
  const [ride2] = await db
    .insert(rides)
    .values({
      reference: reference2,
      clientId: primaryClient,
      driverId: verified?.driverId ?? null,
      vehicleId: verified?.vehicleId ?? null,
      customerName: "Sofia Mendes",
      customerPhone: "+244923000001",
      origin: "Talatona Convention Hotel",
      destination: "Ilha de Luanda",
      scheduledAt: at(TOMORROW, 15, 30),
      passengers: 2,
      luggage: 0,
      notes: "Jantar na Ilha.",
      priority: "PRIORIDADE",
      status: verified ? "MOTORISTA_CONFIRMADO" : "MOTORISTA_PROCURADO",
      priceKz: 18_000,
      priceConfirmedAt: new Date(),
      cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
      cancellationPolicyCommunicatedAt: new Date(),
      assignedBy: assistantId,
    })
    .returning();

  if (ride2) {
    await db.insert(rideEvents).values([
      { rideId: ride2.id, toStatus: "NOVO", actorId: primaryClient, actorRole: "client" },
      {
        rideId: ride2.id,
        fromStatus: "NOVO",
        toStatus: "EM_ANALISE",
        actorId: assistantId,
        actorRole: "assistant",
      },
      {
        rideId: ride2.id,
        fromStatus: "EM_ANALISE",
        toStatus: "MOTORISTA_PROCURADO",
        actorId: assistantId,
        actorRole: "assistant",
        note: "Motorista atribuído manualmente",
      },
      {
        rideId: ride2.id,
        fromStatus: "MOTORISTA_PROCURADO",
        toStatus: "MOTORISTA_CONFIRMADO",
        actorId: verified?.driverId ?? null,
        actorRole: "driver",
        note: "Motorista aceitou o convite",
      },
    ]);
  }

  const secondDriver = driverRefs[1] ?? verified;
  const reference3 = await nextRideReference();
  const [ride3] = await db
    .insert(rides)
    .values({
      reference: reference3,
      clientId: primaryClient,
      driverId: secondDriver?.driverId ?? null,
      vehicleId: secondDriver?.vehicleId ?? null,
      customerName: "Sofia Mendes",
      customerPhone: "+244923000001",
      origin: "Hotel Presidente",
      destination: "Aeroporto Internacional 4 de Fevereiro",
      scheduledAt: at(YESTERDAY, 8),
      passengers: 1,
      luggage: 1,
      priority: "NORMAL",
      status: "CONCLUIDO",
      priceKz: 12_000,
      priceConfirmedAt: YESTERDAY,
      cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
      cancellationPolicyCommunicatedAt: YESTERDAY,
      paymentStatus: "PAGO",
      paymentMethod: "DINHEIRO",
      completedAt: YESTERDAY,
      createdAt: new Date(YESTERDAY.getTime() - 3 * 60 * 60 * 1000),
      assignedBy: assistantId,
    })
    .returning();

  if (ride3) {
    const base = new Date(YESTERDAY.getTime() - 3 * 60 * 60 * 1000);
    const step = (minutes: number) => new Date(base.getTime() + minutes * 60_000);
    await db.insert(rideEvents).values([
      {
        rideId: ride3.id,
        toStatus: "NOVO",
        actorId: primaryClient,
        actorRole: "client",
        createdAt: step(0),
      },
      {
        rideId: ride3.id,
        fromStatus: "NOVO",
        toStatus: "EM_ANALISE",
        actorId: assistantId,
        actorRole: "assistant",
        createdAt: step(10),
      },
      {
        rideId: ride3.id,
        fromStatus: "EM_ANALISE",
        toStatus: "MOTORISTA_PROCURADO",
        actorId: assistantId,
        actorRole: "assistant",
        createdAt: step(20),
      },
      {
        rideId: ride3.id,
        fromStatus: "MOTORISTA_PROCURADO",
        toStatus: "MOTORISTA_CONFIRMADO",
        actorId: secondDriver?.driverId ?? null,
        actorRole: "driver",
        createdAt: step(35),
      },
      {
        rideId: ride3.id,
        fromStatus: "MOTORISTA_CONFIRMADO",
        toStatus: "CLIENTE_CONFIRMADO",
        actorId: primaryClient,
        actorRole: "client",
        createdAt: step(45),
      },
      {
        rideId: ride3.id,
        fromStatus: "CLIENTE_CONFIRMADO",
        toStatus: "EM_VIAGEM",
        actorId: secondDriver?.driverId ?? null,
        actorRole: "driver",
        createdAt: step(120),
      },
      {
        rideId: ride3.id,
        fromStatus: "EM_VIAGEM",
        toStatus: "CONCLUIDO",
        actorId: secondDriver?.driverId ?? null,
        actorRole: "driver",
        createdAt: step(165),
      },
    ]);

    if (secondDriver) {
      await db
        .insert(ratings)
        .values({
          rideId: ride3.id,
          clientId: primaryClient,
          driverId: secondDriver.driverId,
          stars: 5,
          comment: "Motorista pontual e simpático.",
          wouldRecommend: true,
        })
        .onConflictDoNothing();
    }
  }
}

async function main() {
  console.log("A criar dados de demonstração Nzila...");

  const adminId = await seedUser({
    email: "admin@nzila.ao",
    role: "admin",
    fullName: "Administrador Nzila",
    whatsapp: "+244923000900",
  });

  const assistantIds = [
    await seedUser({
      email: "assistente1@nzila.ao",
      role: "assistant",
      fullName: "Joana Baptista",
      whatsapp: "+244923000901",
    }),
    await seedUser({
      email: "assistente2@nzila.ao",
      role: "assistant",
      fullName: "Carlos Miguel",
      whatsapp: "+244923000902",
    }),
  ];

  const clientIds = [
    await seedUser({
      email: "cliente1@nzila.ao",
      role: "client",
      fullName: "Sofia Mendes",
      whatsapp: "+244923000001",
    }),
    await seedUser({
      email: "cliente2@nzila.ao",
      role: "client",
      fullName: "James Carter",
      whatsapp: "+244923000002",
      locale: "en",
    }),
  ];

  for (const [index, id] of clientIds.entries()) {
    await db
      .insert(clients)
      .values({
        id,
        nationality: index === 0 ? "Portugal" : "Reino Unido",
        arrivalDate: "2026-11-10",
        hotel: index === 0 ? "Epic Sana Luanda Hotel" : "Talatona Convention Hotel",
      })
      .onConflictDoUpdate({
        target: clients.id,
        set: {
          nationality: index === 0 ? "Portugal" : "Reino Unido",
          arrivalDate: "2026-11-10",
          hotel: index === 0 ? "Epic Sana Luanda Hotel" : "Talatona Convention Hotel",
        },
      });
  }

  const driverRefs = await seedDrivers(clientIds);
  await seedPlaces();
  await seedPlaceMessages([
    assistantIds[0] ?? adminId,
    driverRefs[0]?.driverId ?? adminId,
    clientIds[1] ?? clientIds[0]!,
    assistantIds[1] ?? adminId,
    clientIds[0]!,
  ]);
  await seedSampleRides(clientIds, driverRefs, assistantIds[0] ?? adminId);

  await db.execute(sql`
    update drivers d
    set rating_count = coalesce(stats.total, 0),
        rating_avg = coalesce(stats.average, 0)
    from (
      select driver_id, count(*)::int as total, round(avg(stars)::numeric, 2) as average
      from ratings
      group by driver_id
    ) stats
    where stats.driver_id = d.id
  `);

  console.log("");
  console.log("Dados criados. Contas de demonstração (password em DEMO_SEED_PASSWORD):");
  console.log("  admin@nzila.ao        (admin)");
  console.log("  assistente1@nzila.ao  (assistant)");
  console.log("  assistente2@nzila.ao  (assistant)");
  console.log("  cliente1@nzila.ao     (client)");
  console.log("  cliente2@nzila.ao     (client)");
  console.log("  motorista1@nzila.ao   (driver verificado)");
  console.log("  motorista2@nzila.ao   (driver verificado)");
  console.log("  motorista3@nzila.ao   (driver em verificação)");
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
