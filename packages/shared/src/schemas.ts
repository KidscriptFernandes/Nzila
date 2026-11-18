import { z } from "zod";
import {
  CLIENT_RIDE_PRIORITIES,
  DRIVER_DOCUMENT_TYPES,
  DRIVER_VERIFICATION_STATUSES,
  LOCALES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PLACE_CATEGORIES,
  RIDE_PRIORITIES,
  RIDE_STATUSES,
  ROLES,
  SUPPORT_STATUSES,
} from "./enums";
import { MAX_RIDE_LUGGAGE, MAX_RIDE_PASSENGERS, MIN_RIDE_LEAD_MINUTES } from "./constants";

export const uuidSchema = z.string().uuid("Identificador inválido");
export const emailSchema = z.string().trim().toLowerCase().email("Email inválido");
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Usa o formato internacional, ex.: +244923000000");
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD");

export const roleSchema = z.enum(ROLES);
export const rideStatusSchema = z.enum(RIDE_STATUSES);
export const ridePrioritySchema = z.enum(RIDE_PRIORITIES);
export const clientRidePrioritySchema = z.enum(CLIENT_RIDE_PRIORITIES);
export const driverVerificationSchema = z.enum(DRIVER_VERIFICATION_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const documentTypeSchema = z.enum(DRIVER_DOCUMENT_TYPES);
export const placeCategorySchema = z.enum(PLACE_CATEGORIES);
export const supportStatusSchema = z.enum(SUPPORT_STATUSES);
export const localeSchema = z.enum(LOCALES);

export const createRideSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: phoneSchema,
  origin: z.string().trim().min(3).max(200),
  originLat: z.number().min(-90).max(90).optional(),
  originLng: z.number().min(-180).max(180).optional(),
  destination: z.string().trim().min(3).max(200),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  scheduledAt: z.coerce
    .date()
    .refine(
      (d) => d.getTime() > Date.now() + MIN_RIDE_LEAD_MINUTES * 60_000,
      `Mínimo ${MIN_RIDE_LEAD_MINUTES} minutos de antecedência`,
    ),
  passengers: z.number().int().min(1).max(MAX_RIDE_PASSENGERS),
  luggage: z.number().int().min(0).max(MAX_RIDE_LUGGAGE).default(0),
  notes: z.string().trim().max(500).optional(),
  priority: clientRidePrioritySchema.default("NORMAL"),
});

export const ridesQuerySchema = z.object({
  status: rideStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const cancelRideSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const ratingSchema = z.object({
  rideId: uuidSchema,
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  wouldRecommend: z.boolean().optional(),
});

export const supportRequestSchema = z.object({
  rideId: uuidSchema.optional(),
  priority: ridePrioritySchema.default("NORMAL"),
  message: z.string().trim().min(5).max(2000),
});

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    whatsapp: phoneSchema.optional(),
    locale: localeSchema.optional(),
    nationality: z.string().trim().max(80).nullable().optional(),
    arrivalDate: isoDateSchema.nullable().optional(),
    hotel: z.string().trim().max(160).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nada para atualizar");

export const pushTokenSchema = z.object({
  token: z.string().trim().min(10).max(500),
  platform: z.enum(["ios", "android", "web"]),
});

export const registerProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  whatsapp: phoneSchema,
  locale: localeSchema.default("pt-AO"),
  nationality: z.string().trim().max(80).optional(),
  arrivalDate: isoDateSchema.optional(),
  hotel: z.string().trim().max(160).optional(),
  consent: z.literal(true, "É necessário aceitar a política de privacidade"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const signUpSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(120),
  whatsapp: phoneSchema,
});

export const registerAccountSchema = registerProfileSchema.extend({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const otpRequestSchema = z.object({
  email: emailSchema,
});

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Código inválido"),
});

export const assignDriverSchema = z.object({
  driverId: uuidSchema,
  vehicleId: uuidSchema,
});

export const priceSchema = z.object({
  priceKz: z.number().int().positive("O preço deve ser positivo"),
  cancellationPolicy: z.string().trim().min(10).max(1000).optional(),
});

export const cancellationPolicySchema = z.object({
  cancellationPolicy: z.string().trim().min(10).max(1000),
});

export const paymentSchema = z.object({
  paymentStatus: paymentStatusSchema,
  paymentMethod: paymentMethodSchema.optional(),
});

export const analyseRideSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const createDriverSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  whatsapp: phoneSchema,
  zones: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
  references: z.string().trim().max(1000).optional(),
  vehicle: z.object({
    make: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    color: z.string().trim().min(2).max(40),
    plate: z.string().trim().min(3).max(20),
    seats: z.number().int().min(1).max(8).default(4),
  }),
});

export const verificationUpdateSchema = z.object({
  verification: driverVerificationSchema,
  note: z.string().trim().max(500).optional(),
});

export const driverDocumentUploadSchema = z.object({
  type: documentTypeSchema,
  filename: z.string().trim().min(1).max(200),
  contentType: z
    .string()
    .trim()
    .regex(/^(image\/(jpeg|png|webp)|application\/pdf)$/, "Formato não suportado"),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
  expiresAt: z.coerce.date().optional(),
});

export const placesQuerySchema = z.object({
  category: placeCategorySchema.optional(),
  q: z.string().trim().max(120).optional(),
  minLat: z.coerce.number().min(-90).max(90).optional(),
  minLng: z.coerce.number().min(-180).max(180).optional(),
  maxLat: z.coerce.number().min(-90).max(90).optional(),
  maxLng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const placePhotoSchema = z.object({
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Imagem inválida")
    .max(3_000_000, "Imagem demasiado grande"),
});

export const createPlaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: placeCategorySchema,
  description: z.string().trim().max(1000).nullish(),
  address: z.string().trim().max(200).nullish(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().trim().max(30).nullish(),
  googleMapsUrl: z.string().trim().url().max(500).nullish(),
  published: z.boolean().default(true),
  photo: placePhotoSchema.optional(),
});

export const placeMessageSchema = z
  .object({
    body: z.string().trim().max(500).default(""),
    photo: placePhotoSchema.optional(),
  })
  .refine((data) => data.body.length > 0 || Boolean(data.photo), {
    message: "Escreve uma mensagem ou anexa uma foto",
    path: ["body"],
  });

export const placeMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.coerce.date().optional(),
});

export const adminRidesQuerySchema = z.object({
  status: rideStatusSchema.optional(),
  priority: ridePrioritySchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const adminSupportQuerySchema = z.object({
  status: supportStatusSchema.optional(),
  priority: ridePrioritySchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const adminDriversQuerySchema = z.object({
  verification: driverVerificationSchema.optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const updateRideRouteSchema = z
  .object({
    origin: z.string().trim().min(3).max(200).optional(),
    originLat: z.number().min(-90).max(90).nullable().optional(),
    originLng: z.number().min(-180).max(180).nullable().optional(),
    destination: z.string().trim().min(3).max(200).optional(),
    destinationLat: z.number().min(-90).max(90).nullable().optional(),
    destinationLng: z.number().min(-180).max(180).nullable().optional(),
  })
  .refine(
    (data) => data.origin !== undefined || data.destination !== undefined,
    "Indica pelo menos a origem ou o destino",
  );

export const updateSupportSchema = z.object({
  status: z.enum(["EM_ATENDIMENTO", "RESOLVIDO"]),
  note: z.string().trim().max(1000).optional(),
});

export type CreateRideInput = z.input<typeof createRideSchema>;
export type CreateRidePayload = z.output<typeof createRideSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
export type PlaceMessageInput = z.infer<typeof placeMessageSchema>;
export type RegisterProfileInput = z.infer<typeof registerProfileSchema>;
export type RegisterAccountInput = z.infer<typeof registerAccountSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
