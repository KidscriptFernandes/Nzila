import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { docTypeEnum, driverVerificationEnum } from "./enums";
import { profiles } from "./profiles";

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    verification: driverVerificationEnum("verification").notNull().default("PENDENTE"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => profiles.id),
    zones: text("zones").array().notNull().default(sql`'{}'::text[]`),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    references: text("references"),
    available: boolean("available").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("drivers_code_uq").on(t.code),
    index("drivers_verification_idx").on(t.verification, t.available),
  ],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    color: text("color").notNull(),
    plate: text("plate").notNull(),
    seats: integer("seats").notNull().default(4),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vehicles_plate_uq").on(t.plate),
    index("vehicles_driver_idx").on(t.driverId),
    check("vehicles_seats_chk", sql`${t.seats} between 1 and 8`),
  ],
);

export const driverDocuments = pgTable(
  "driver_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    type: docTypeEnum("type").notNull(),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("driver_docs_driver_idx").on(t.driverId)],
);
