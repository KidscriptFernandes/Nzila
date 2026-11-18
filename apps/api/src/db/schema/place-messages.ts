import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { places } from "./misc";
import { profiles } from "./profiles";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const placeMessages = pgTable(
  "place_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    photoMime: text("photo_mime"),
    photoData: bytea("photo_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("place_messages_place_idx").on(t.placeId, t.createdAt),
    check("place_messages_body_chk", sql`char_length(${t.body}) <= 500`),
    check(
      "place_messages_content_chk",
      sql`char_length(btrim(${t.body})) > 0 or ${t.photoData} is not null`,
    ),
    check(
      "place_messages_photo_size_chk",
      sql`${t.photoData} is null or octet_length(${t.photoData}) <= 2097152`,
    ),
  ],
);
