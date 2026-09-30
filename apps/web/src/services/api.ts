import { HealthCheckResponse } from '@waypoint/shared';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`API health check failed with status: ${res.status}`);
  }
  return res.json();
}
