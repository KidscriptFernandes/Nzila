import { boolean, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    role: roleEnum("role").notNull().default("client"),
    fullName: text("full_name").notNull(),
    whatsapp: text("whatsapp").notNull(),
    locale: text("locale").notNull().default("pt-AO"),
    active: boolean("active").notNull().default(true),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("profiles_role_idx").on(t.role)],
);

export const clients = pgTable("clients", {
  id: uuid("id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  nationality: text("nationality"),
  arrivalDate: date("arrival_date"),
  hotel: text("hotel"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
