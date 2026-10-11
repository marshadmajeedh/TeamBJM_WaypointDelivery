import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { config } from '../src/config';

describe('Backend Role-Based Authentication & Authorization Foundation', () => {
  const plainPassword = 'secure_test_password_123';
  let hashedPassword = '';

  const mockLoaderUser: User = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'loader@waypoint.local',
    passwordHash: '',
    role: UserRole.LOADER,
    name: 'Warehouse Loader Test',
    phone: '0771234567',
    depotId: 'depot-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDispatcherUser: User = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'dispatcher@waypoint.local',
    passwordHash: '',
    role: UserRole.DISPATCHER,
    name: 'Chief Dispatcher Test',
    phone: '0777654321',
    depotId: 'depot-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    if (!hashedPassword) {
      hashedPassword = await bcrypt.hash(plainPassword, 6);
    }
    mockLoaderUser.passwordHash = hashedPassword;
    mockDispatcherUser.passwordHash = hashedPassword;
  });

  // 1. Valid login succeeds
  it('1. valid login succeeds with 200, JWT token and user profile', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockLoaderUser);

    const response = await request(app).post('/api/auth/login').send({
      email: 'loader@waypoint.local',
      password: plainPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(typeof response.body.data.token).toBe('string');
    expect(response.body.data.user.id).toBe(mockLoaderUser.id);
    expect(response.body.data.user.email).toBe(mockLoaderUser.email);
    expect(response.body.data.user.role).toBe(UserRole.LOADER);
  });

  // 2. Wrong password returns 401
  it('2. wrong password returns generic 401 unauthorized message', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockLoaderUser);

    const response = await request(app).post('/api/auth/login').send({
      email: 'loader@waypoint.local',
      password: 'incorrect_password_attempt',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  // 3. Unknown email returns 401
  it('3. unknown email returns generic 401 unauthorized message', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const response = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@waypoint.local',
      password: plainPassword,
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  // 4. Protected endpoint without token returns 401
  it('4. protected endpoint without token returns 401', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Authentication token required');
  });

  // 5. Valid token accesses protected endpoint
  it('5. valid token accesses protected endpoint (GET /api/auth/me)', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockLoaderUser);

    const validToken = jwt.sign(
      { sub: mockLoaderUser.id, role: mockLoaderUser.role },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(mockLoaderUser.id);
    expect(response.body.data.email).toBe(mockLoaderUser.email);
    expect(response.body.data.role).toBe(UserRole.LOADER);
  });

  // 6. Incorrect role returns 403
  it('6. authenticated user with incorrect role returns 403 forbidden', async () => {
    // LOADER attempts to access DISPATCHER test endpoint
    const loaderToken = jwt.sign(
      { sub: mockLoaderUser.id, role: UserRole.LOADER },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    const response = await request(app)
      .get('/api/auth/test/dispatcher')
      .set('Authorization', `Bearer ${loaderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.message).toContain('Access forbidden');
  });

  // 7. Correct role succeeds
  it('7. authenticated user with correct role succeeds with 200', async () => {
    // LOADER accesses LOADER test endpoint
    const loaderToken = jwt.sign(
      { sub: mockLoaderUser.id, role: UserRole.LOADER },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    const response = await request(app)
      .get('/api/auth/test/loader')
      .set('Authorization', `Bearer ${loaderToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toBe('Loader access granted');
  });

  // 8. Password hash is never returned
  it('8. password hash is strictly never returned in login or /me responses', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockLoaderUser);

    // Check login response
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'loader@waypoint.local',
      password: plainPassword,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(loginResponse.body)).not.toContain(hashedPassword);

    // Check /me response
    const token = loginResponse.body.data.token;
    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.passwordHash).toBeUndefined();
    if (meResponse.body.data.user) {
      expect(meResponse.body.data.user.passwordHash).toBeUndefined();
    }
    expect(JSON.stringify(meResponse.body)).not.toContain(hashedPassword);
  });

  // Additional security checks
  it('rejects malformed or expired JWT with 401', async () => {
    const expiredToken = jwt.sign(
      { sub: mockLoaderUser.id, role: UserRole.LOADER },
      config.jwtSecret,
      { expiresIn: '-1s' }
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('validates login request payload with Zod and returns 400 for invalid email format', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'somepassword',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
