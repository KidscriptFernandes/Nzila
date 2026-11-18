CREATE TABLE "place_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_messages_body_chk" CHECK (char_length("place_messages"."body") between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "place_messages" ADD CONSTRAINT "place_messages_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_messages" ADD CONSTRAINT "place_messages_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "place_messages_place_idx" ON "place_messages" USING btree ("place_id","created_at");