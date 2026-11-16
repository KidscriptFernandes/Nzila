import type {
  DriverVerificationStatus,
  RideDTO,
  RideDriverDTO,
  RideEventDTO,
  RideRatingDTO,
  Role,
  VehicleDTO,
} from "@nzila/shared";
import type { rideEvents, rides, ratings, vehicles } from "../../db/schema";

type RideRow = typeof rides.$inferSelect;
type VehicleRow = typeof vehicles.$inferSelect;
type EventRow = typeof rideEvents.$inferSelect;
type RatingRow = typeof ratings.$inferSelect;

export type DriverJoin = {
  code: string;
  ratingAvg: string;
  ratingCount: number;
  verification: DriverVerificationStatus;
  fullName: string;
  whatsapp: string;
};

const DRIVER_VISIBLE_STATUSES = new Set([
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
  "CONCLUIDO",
]);

const DRIVER_PHONE_VISIBLE_STATUSES = new Set([
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
  "CONCLUIDO",
  "PROBLEMA",
  "CANCELADO",
]);

function toVehicleDto(vehicle: VehicleRow | null | undefined): VehicleDTO | null {
  if (!vehicle) return null;
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    color: vehicle.color,
    plate: vehicle.plate,
    seats: vehicle.seats,
    active: vehicle.active,
  };
}

function toEventDto(event: EventRow): RideEventDTO {
  return {
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorRole: event.actorRole,
    note: event.note,
    createdAt: event.createdAt.toISOString(),
  };
}

function toRatingDto(rating: RatingRow): RideRatingDTO {
  return {
    stars: rating.stars,
    comment: rating.comment,
    wouldRecommend: rating.wouldRecommend,
    createdAt: rating.createdAt.toISOString(),
  };
}

export interface PresentRideOptions {
  actorRole: Role;
  actorId: string;
  driver?: DriverJoin | null;
  vehicle?: VehicleRow | null;
  events?: EventRow[];
  rating?: RatingRow | null;
}

export function presentRide(ride: RideRow, options: PresentRideOptions): RideDTO {
  const isStaff = options.actorRole === "assistant" || options.actorRole === "admin";
  const isDriverActor = options.actorRole === "driver" && ride.driverId === options.actorId;
  const confirmedEver =
    DRIVER_VISIBLE_STATUSES.has(ride.status) ||
    (options.events ?? []).some((event) => event.toStatus === "MOTORISTA_CONFIRMADO");

  let driver: RideDriverDTO | null = null;
  if (options.driver && ride.driverId && (isStaff || isDriverActor || confirmedEver)) {
    driver = {
      id: ride.driverId,
      code: options.driver.code,
      fullName: options.driver.fullName,
      ratingAvg: options.driver.ratingAvg,
      ratingCount: options.driver.ratingCount,
      verified: options.driver.verification === "VERIFICADO",
      vehicle: toVehicleDto(options.vehicle),
      ...(isStaff ? { whatsapp: options.driver.whatsapp } : {}),
    };
  }

  const canSeeCustomerPhone =
    isStaff ||
    options.actorRole === "client" ||
    (isDriverActor && DRIVER_PHONE_VISIBLE_STATUSES.has(ride.status));

  return {
    id: ride.id,
    reference: ride.reference,
    clientId: ride.clientId,
    driverId: ride.driverId,
    vehicleId: ride.vehicleId,
    customerName: ride.customerName,
    ...(canSeeCustomerPhone ? { customerPhone: ride.customerPhone } : {}),
    origin: ride.origin,
    originLat: ride.originLat,
    originLng: ride.originLng,
    destination: ride.destination,
    destinationLat: ride.destinationLat,
    destinationLng: ride.destinationLng,
    scheduledAt: ride.scheduledAt.toISOString(),
    passengers: ride.passengers,
    luggage: ride.luggage,
    notes: ride.notes,
    priority: ride.priority,
    status: ride.status,
    priceKz: ride.priceKz,
    priceConfirmedAt: ride.priceConfirmedAt?.toISOString() ?? null,
    cancellationPolicy: ride.cancellationPolicy,
    cancellationPolicyCommunicatedAt:
      ride.cancellationPolicyCommunicatedAt?.toISOString() ?? null,
    paymentStatus: ride.paymentStatus,
    paymentMethod: ride.paymentMethod,
    cancelReason: ride.cancelReason,
    createdAt: ride.createdAt.toISOString(),
    updatedAt: ride.updatedAt.toISOString(),
    ...(driver ? { driver } : { driver: null }),
    ...(options.rating ? { rating: toRatingDto(options.rating) } : {}),
    ...(options.events ? { events: options.events.map(toEventDto) } : {}),
  };
}
