import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('API Health Endpoint', () => {
  it('GET /api/health returns 200 with status ok and service name', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'waypoint-api',
    });
  });

  it('GET /api/auth/login returns module placeholder response', async () => {
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
