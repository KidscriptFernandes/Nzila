ALTER TABLE "place_messages" DROP CONSTRAINT "place_messages_body_chk";--> statement-breakpoint
ALTER TABLE "place_messages" ADD COLUMN "photo_mime" text;--> statement-breakpoint
ALTER TABLE "place_messages" ADD COLUMN "photo_data" "bytea";--> statement-breakpoint
ALTER TABLE "place_messages" ADD CONSTRAINT "place_messages_content_chk" CHECK (char_length(btrim("place_messages"."body")) > 0 or "place_messages"."photo_data" is not null);--> statement-breakpoint
ALTER TABLE "place_messages" ADD CONSTRAINT "place_messages_photo_size_chk" CHECK ("place_messages"."photo_data" is null or octet_length("place_messages"."photo_data") <= 2097152);--> statement-breakpoint
ALTER TABLE "place_messages" ADD CONSTRAINT "place_messages_body_chk" CHECK (char_length("place_messages"."body") <= 500);