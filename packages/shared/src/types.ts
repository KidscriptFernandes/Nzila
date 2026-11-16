import type {
  DriverDocumentType,
  DriverVerificationStatus,
  Locale,
  PaymentMethod,
  PaymentStatus,
  PlaceCategory,
  RidePriority,
  RideStatus,
  Role,
  SupportStatus,
} from "./enums";

export type ISODateString = string;

export interface ApiErrorBody {
  code: string;
  message: string;
  issues?: unknown;
  requestId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProfileDTO {
  id: string;
  role: Role;
  fullName: string;
  whatsapp: string;
  locale: Locale;
  active: boolean;
  consentAt: ISODateString | null;
  createdAt: ISODateString;
  client?: ClientProfileDTO | null;
  driver?: DriverProfileDTO | null;
}

export interface ClientProfileDTO {
  nationality: string | null;
  arrivalDate: string | null;
  hotel: string | null;
}

export interface DriverProfileDTO {
  code: string;
  verification: DriverVerificationStatus;
  verifiedAt: ISODateString | null;
  zones: string[];
  ratingAvg: string;
  ratingCount: number;
  available: boolean;
  vehicles: VehicleDTO[];
  documents?: DriverDocumentDTO[];
}

export interface VehicleDTO {
  id: string;
  make: string;
  model: string;
  color: string;
  plate: string;
  seats: number;
  active: boolean;
}

export interface DriverDocumentDTO {
  id: string;
  type: DriverDocumentType;
  expiresAt: ISODateString | null;
  createdAt: ISODateString;
}

export interface RideDriverDTO {
  id: string;
  code: string;
  fullName: string;
  whatsapp?: string;
  ratingAvg: string;
  ratingCount: number;
  verified: boolean;
  vehicle: VehicleDTO | null;
}

export interface RideRatingDTO {
  stars: number;
  comment: string | null;
  wouldRecommend: boolean | null;
  createdAt: ISODateString;
}

export interface RideDTO {
  id: string;
  reference: string;
  clientId: string;
  driverId: string | null;
  vehicleId: string | null;
  customerName: string;
  customerPhone: string;
  origin: string;
  originLat: string | null;
  originLng: string | null;
  destination: string;
  destinationLat: string | null;
  destinationLng: string | null;
  scheduledAt: ISODateString;
  passengers: number;
  luggage: number;
  notes: string | null;
  priority: RidePriority;
  status: RideStatus;
  priceKz: number | null;
  priceConfirmedAt: ISODateString | null;
  cancellationPolicy: string | null;
  cancellationPolicyCommunicatedAt: ISODateString | null;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  cancelReason: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  driver?: RideDriverDTO | null;
  rating?: RideRatingDTO | null;
  events?: RideEventDTO[];
}

export interface RideEventDTO {
  id: string;
  fromStatus: RideStatus | null;
  toStatus: RideStatus;
  actorRole: string | null;
  note: string | null;
  createdAt: ISODateString;
}

export interface PlaceDTO {
  id: string;
  name: string;
  category: PlaceCategory;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  googleMapsUrl: string | null;
  published: boolean;
}

export interface SupportRequestDTO {
  id: string;
  profileId: string;
  rideId: string | null;
  priority: RidePriority;
  message: string;
  status: SupportStatus;
  handledBy: string | null;
  createdAt: ISODateString;
  resolvedAt: ISODateString | null;
  riderName?: string;
  riderPhone?: string;
}

export interface DriverInviteDTO {
  ride: RideDTO;
  vehicle: VehicleDTO | null;
}

export interface AdminMetricsDTO {
  requestsTotal: number;
  requestsToday: number;
  confirmedTotal: number;
  paidTotal: number;
  cancelledTotal: number;
  noDriverTotal: number;
  ratingsAvg: number;
  recommendRate: number;
  avgMinutesToDriver: number | null;
  driversCandidates: number;
  driversVerified: number;
  supportOpen: number;
  supportUrgentOpen: number;
  byStatus: Record<string, number>;
}
