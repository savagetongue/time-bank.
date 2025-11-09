import { ApiResponse } from '@shared/types';
const BASE_URL = '/api';
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'An unknown error occurred',
        details: data.details,
      };
    }
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error(`API fetch error for endpoint ${endpoint}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Network error or invalid JSON response';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint:string, body: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};