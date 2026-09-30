import {
  HealthCheckResponse,
  LoginRequest,
  LoginResponseData,
  AuthenticatedUser,
  ApiResponseSuccess,
  LoadingTasksResponseData,
  VehicleLoadingDetails,
} from '@waypoint/shared';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'waypoint_token';
const USER_KEY = 'waypoint_user';

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Graceful fallback for restricted environments
  }
}

export function removeStoredToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Graceful fallback
  }
}

export function getStoredUser(): AuthenticatedUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthenticatedUser): void {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Graceful fallback
  }
}

export function removeStoredUser(): void {
  try {
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // Graceful fallback
  }
}

export interface ApiErrorDetails extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * Shared API request wrapper that automatically attaches Authorization Bearer header
 * from sessionStorage when available.
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message || `Request failed with status ${res.status}`;
    const error: ApiErrorDetails = new Error(message);
    error.status = res.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details;
    throw error;
  }

  return body as T;
}

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`API health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function loginApi(credentials: LoginRequest): Promise<LoginResponseData> {
  const response = await apiRequest<ApiResponseSuccess<LoginResponseData>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return response.data;
}

export async function fetchMeApi(): Promise<AuthenticatedUser> {
  const response = await apiRequest<ApiResponseSuccess<AuthenticatedUser>>('/auth/me');
  return response.data;
}

/**
 * Loader Feature 1 (LS-02): Fetch loading tasks for current shift/depot.
 */
export async function fetchLoadingTasks(): Promise<LoadingTasksResponseData> {
  const response = await apiRequest<ApiResponseSuccess<LoadingTasksResponseData>>('/loading/tasks');
  return response.data;
}

/**
 * Loader Feature 1 (LS-03): Fetch vehicle loading details for a specific trip.
 */
export async function fetchVehicleLoadingDetails(tripId: string): Promise<VehicleLoadingDetails> {
  const response = await apiRequest<ApiResponseSuccess<VehicleLoadingDetails>>(`/loading/tasks/${encodeURIComponent(tripId)}`);
  return response.data;
}
