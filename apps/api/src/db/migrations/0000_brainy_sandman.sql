CREATE TYPE "public"."doc_type" AS ENUM('IDENTIFICACAO', 'CARTA_CONDUCAO', 'LIVRETE_VIATURA', 'SEGURO', 'FOTO_MOTORISTA', 'FOTO_VIATURA', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."driver_verification" AS ENUM('PENDENTE', 'EM_VERIFICACAO', 'VERIFICADO', 'REPROVADO');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('DINHEIRO', 'TRANSFERENCIA', 'MULTICAIXA_EXPRESS', 'CARTAO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDENTE', 'PAGO', 'REEMBOLSADO', 'FALHOU');--> statement-breakpoint
CREATE TYPE "public"."place_category" AS ENUM('HOTEL', 'RESTAURANTE', 'HOSPITAL', 'FARMACIA', 'BANCO', 'ATM', 'ATRACAO', 'AEROPORTO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('NORMAL', 'PRIORIDADE', 'URGENTE');--> statement-breakpoint
CREATE TYPE "public"."ride_status" AS ENUM('NOVO', 'EM_ANALISE', 'MOTORISTA_PROCURADO', 'MOTORISTA_CONFIRMADO', 'CLIENTE_CONFIRMADO', 'EM_VIAGEM', 'CONCLUIDO', 'CANCELADO', 'SEM_MOTORISTA', 'PROBLEMA');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('client', 'driver', 'assistant', 'admin');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nationality" text,
	"arrival_date" date,
	"hotel" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "role" DEFAULT 'client' NOT NULL,
	"full_name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"locale" text DEFAULT 'pt-AO' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"type" "doc_type" NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text,
	"size_bytes" integer,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"verification" "driver_verification" DEFAULT 'PENDENTE' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"zones" text[] DEFAULT '{}'::text[] NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"references" text,
	"available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"color" text NOT NULL,
	"plate" text NOT NULL,
	"seats" integer DEFAULT 4 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_seats_chk" CHECK ("vehicles"."seats" between 1 and 8)
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"stars" integer NOT NULL,
	"comment" text,
	"would_recommend" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_ride_id_unique" UNIQUE("ride_id"),
	CONSTRAINT "ratings_stars_chk" CHECK ("ratings"."stars" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "ride_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid NOT NULL,
	"from_status" "ride_status",
	"to_status" "ride_status" NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"note" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"client_id" uuid NOT NULL,
	"driver_id" uuid,
	"vehicle_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"origin" text NOT NULL,
	"origin_lat" text,
	"origin_lng" text,
	"destination" text NOT NULL,
	"destination_lat" text,
	"destination_lng" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"passengers" integer DEFAULT 1 NOT NULL,
	"luggage" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"priority" "priority" DEFAULT 'NORMAL' NOT NULL,
	"status" "ride_status" DEFAULT 'NOVO' NOT NULL,
	"price_kz" integer,
	"price_confirmed_at" timestamp with time zone,
	"cancellation_policy" text,
	"cancellation_policy_communicated_at" timestamp with time zone,
	"payment_status" "payment_status" DEFAULT 'PENDENTE' NOT NULL,
	"payment_method" "payment_method",
	"assigned_by" uuid,
	"cancel_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rides_passengers_chk" CHECK ("rides"."passengers" between 1 and 8),
	CONSTRAINT "rides_luggage_chk" CHECK ("rides"."luggage" between 0 and 10),
	CONSTRAINT "rides_price_chk" CHECK ("rides"."price_kz" is null or "rides"."price_kz" > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"meta" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"ride_id" uuid,
	"channel" text DEFAULT 'push' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"sent_at" timestamp with time zone,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "place_category" NOT NULL,
	"description" text,
	"address" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"phone" text,
	"google_maps_url" text,
	"published" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"ride_id" uuid,
	"priority" "priority" DEFAULT 'NORMAL' NOT NULL,
	"message" text NOT NULL,
	"status" "support_status" DEFAULT 'ABERTO' NOT NULL,
	"handled_by" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_id_profiles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_id_profiles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_assigned_by_profiles_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_handled_by_profiles_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "driver_docs_driver_idx" ON "driver_documents" USING btree ("driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_code_uq" ON "drivers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "drivers_verification_idx" ON "drivers" USING btree ("verification","available");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_uq" ON "vehicles" USING btree ("plate");--> statement-breakpoint
CREATE INDEX "vehicles_driver_idx" ON "vehicles" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "ratings_driver_idx" ON "ratings" USING btree ("driver_id","created_at");--> statement-breakpoint
CREATE INDEX "ride_events_ride_idx" ON "ride_events" USING btree ("ride_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rides_reference_uq" ON "rides" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "rides_client_idx" ON "rides" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "rides_driver_idx" ON "rides" USING btree ("driver_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "rides_status_idx" ON "rides" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "rides_payment_idx" ON "rides" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "places_cat_idx" ON "places" USING btree ("category","published");--> statement-breakpoint
CREATE INDEX "push_tokens_profile_idx" ON "push_tokens" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "support_status_idx" ON "support_requests" USING btree ("status","priority","created_at");