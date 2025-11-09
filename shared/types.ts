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