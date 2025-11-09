// Using "export type" for pure type exports
export type User = {
  id: number;
  name: string;
  email: string;
  roles: string[]; // e.g., ['member', 'provider']
  is_provider: boolean;
  created_at: string;
};
export type AuthResponse = {
  user: User;
  token: string;
};
export type Member = {
  id: number;
  name: string;
  email: string;
  is_provider: boolean;
  created_at: string;
  // Optional fields for public profiles
  rating?: number;
  avatarUrl?: string;
};
export type Offer = {
  id: number;
  provider_id: number;
  title: string;
  description: string;
  skills: string[];
  rate_per_hour: number;
  is_active: boolean;
  created_at: string;
  provider: Member; // Nested provider info
};
export type Request = {
    id: number;
    offer_id: number;
    member_id: number;
    note?: string;
    status: 'OPEN' | 'MATCHED' | 'CANCELLED';
    created_at: string;
};
export type RequestWithDetails = Request & {
  offer: Offer;
  member: Member;
};
export type Booking = {
  id: number;
  request_id: number;
  start_time: string;
  duration_minutes: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  created_at: string;
};
export type BookingWithDetails = Booking & {
  request: Request;
  offer: Offer;
  provider: Member;
  member: Member;
};
export type Escrow = {
  id: number;
  booking_id: number;
  amount: number;
  status: 'HELD' | 'RELEASED' | 'REFUNDED';
  created_at: string;
};
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};
export type ApiErrorResponse = {
  success: false;
  error: string;
  details?: unknown;
};
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;