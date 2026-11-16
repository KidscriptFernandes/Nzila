import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { clients, profiles } from "./profiles";
import { drivers, vehicles } from "./drivers";
import {
  paymentMethodEnum,
  paymentStatusEnum,
  priorityEnum,
  rideStatusEnum,
} from "./enums";

export const rides = pgTable(
  "rides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    driverId: uuid("driver_id").references(() => drivers.id),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),

    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    origin: text("origin").notNull(),
    originLat: text("origin_lat"),
    originLng: text("origin_lng"),
    destination: text("destination").notNull(),
    destinationLat: text("destination_lat"),
    destinationLng: text("destination_lng"),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    passengers: integer("passengers").notNull().default(1),
    luggage: integer("luggage").notNull().default(0),
    notes: text("notes"),
    priority: priorityEnum("priority").notNull().default("NORMAL"),

    status: rideStatusEnum("status").notNull().default("NOVO"),
    priceKz: integer("price_kz"),
    priceConfirmedAt: timestamp("price_confirmed_at", { withTimezone: true }),
    cancellationPolicy: text("cancellation_policy"),
    cancellationPolicyCommunicatedAt: timestamp("cancellation_policy_communicated_at", {
      withTimezone: true,
    }),

    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDENTE"),
    paymentMethod: paymentMethodEnum("payment_method"),

    assignedBy: uuid("assigned_by").references(() => profiles.id),
    cancelReason: text("cancel_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rides_reference_uq").on(t.reference),
    index("rides_client_idx").on(t.clientId, t.createdAt),
    index("rides_driver_idx").on(t.driverId, t.scheduledAt),
    index("rides_status_idx").on(t.status, t.scheduledAt),
    index("rides_payment_idx").on(t.paymentStatus),
    check("rides_passengers_chk", sql`${t.passengers} between 1 and 8`),
    check("rides_luggage_chk", sql`${t.luggage} between 0 and 10`),
    check("rides_price_chk", sql`${t.priceKz} is null or ${t.priceKz} > 0`),
  ],
);

export const rideEvents = pgTable(
  "ride_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id")
      .notNull()
      .references(() => rides.id, { onDelete: "cascade" }),
    fromStatus: rideStatusEnum("from_status"),
    toStatus: rideStatusEnum("to_status").notNull(),
    actorId: uuid("actor_id").references(() => profiles.id),
    actorRole: text("actor_role"),
    note: text("note"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ride_events_ride_idx").on(t.rideId, t.createdAt)],
);

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id")
      .notNull()
      .unique()
      .references(() => rides.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id),
    stars: integer("stars").notNull(),
    comment: text("comment"),
    wouldRecommend: boolean("would_recommend"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ratings_driver_idx").on(t.driverId, t.createdAt),
    check("ratings_stars_chk", sql`${t.stars} between 1 and 5`),
  ],
);
