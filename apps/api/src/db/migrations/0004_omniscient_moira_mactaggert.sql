ALTER TYPE "public"."place_category" ADD VALUE 'PARAGEM' BEFORE 'ATRACAO';--> statement-breakpoint
ALTER TYPE "public"."place_category" ADD VALUE 'POSTO' BEFORE 'ATRACAO';--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "photo_mime" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "photo_data" "bytea";--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_photo_size_chk" CHECK ("places"."photo_data" is null or octet_length("places"."photo_data") <= 2097152);