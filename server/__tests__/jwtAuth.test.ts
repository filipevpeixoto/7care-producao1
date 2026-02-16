import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';

/*
 * jwtAuth.ts creates `new NeonAdapter()` at module scope.
 * The setup.ts file mocks `../../neonAdapter` so the real DB is never hit.
 * We also mock `../../shared/auth` here to control token generation/verification.
 *
 * vi.hoisted() is required because vi.mock() factories are hoisted above
 * all imports — plain const declarations would hit a temporal dead zone.
 */

const {
  mockGenerateFingerprint,
  mockGenerateTokens,
  mockVerifyAccessToken,
  mockVerifyRefreshToken,
  mockGetUserById,
  mockIsBlacklisted,
} = vi.hoisted(() => ({
  mockGenerateFingerprint: vi.fn().mockReturnValue('fp-hash'),
  mockGenerateTokens: vi.fn().mockReturnValue({
    accessToken: 'access-tok',
    refreshToken: 'refresh-tok',
    expiresIn: 900,
  }),
  mockVerifyAccessToken: vi.fn(),
  mockVerifyRefreshToken: vi.fn(),
  mockGetUserById: vi.fn(),
  mockIsBlacklisted: vi.fn().mockReturnValue(false),
}));

vi.mock('../../shared/auth', () => ({
  generateFingerprint: (...args: unknown[]) => mockGenerateFingerprint(...args),
  generateTokens: (...args: unknown[]) => mockGenerateTokens(...args),
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
  verifyRefreshToken: (...args: unknown[]) => mockVerifyRefreshToken(...args),
}));

vi.mock('../neonAdapter', () => ({
  NeonAdapter: vi.fn().mockImplementation(() => ({
    getUserById: mockGetUserById,
  })),
}));

vi.mock('../services/tokenBlacklistService', () => ({
  tokenBlacklist: {
    isBlacklisted: (...args: unknown[]) => mockIsBlacklisted(...args),
    blacklist: vi.fn(),
  },
}));

// Now import the module under test
import {
  requireJwtAuth,
  optionalJwtAuth,
  requireRole,
  generateTokens,
  verifyAccessToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  type AuthenticatedRequest,
} from '../middleware/jwtAuth';

// ── Helpers ─────────────────────────────────────────────────────
function mockReq(
  overrides: Partial<AuthenticatedRequest> = {}
): AuthenticatedRequest {
  return {
    headers: {},
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    cookies: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

function mockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  return { status, json, cookie, clearCookie } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
}

const validPayload = {
  id: 1,
  email: 'user@test.com',
  role: 'member' as const,
  name: 'Test User',
  church: 'Test Church',
  districtId: 10,
  type: 'access' as const,
};

const activeUser = {
  id: 1,
  email: 'user@test.com',
  role: 'member',
  name: 'Test User',
  status: 'approved',
  church: 'Test Church',
  districtId: 10,
};

// ─── Token generation wrappers ──────────────────────────────────
describe('generateTokens', () => {
  it('delegates to shared auth module', () => {
    mockGenerateTokens.mockReturnValue({
      accessToken: 'access-tok',
      refreshToken: 'refresh-tok',
      expiresIn: 900,
    });
    const user = { id: 1, email: 'a@b.com', role: 'member', name: 'A' };
    const result = generateTokens(user);
    expect(result).toEqual({ accessToken: 'access-tok', refreshToken: 'refresh-tok', expiresIn: 900 });
  });
});

describe('verifyAccessToken', () => {
  it('delegates to shared auth module', () => {
    mockVerifyAccessToken.mockReturnValueOnce(validPayload);
    const result = verifyAccessToken('tok', 'fp');
    expect(result).toEqual(validPayload);
    expect(mockVerifyAccessToken).toHaveBeenCalledWith('tok', 'fp');
  });

  it('returns null for invalid token', () => {
    mockVerifyAccessToken.mockReturnValueOnce(null);
    expect(verifyAccessToken('bad')).toBeNull();
  });
});

// ─── Cookie helpers ─────────────────────────────────────────────
describe('cookie helpers', () => {
  it('setRefreshTokenCookie sets httpOnly cookie', () => {
    const res = mockRes();
    setRefreshTokenCookie(res as unknown as Response, 'my-refresh');
    expect(res.cookie).toHaveBeenCalledWith(
      '7care_refresh_token',
      'my-refresh',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' })
    );
  });

  it('clearRefreshTokenCookie clears the cookie', () => {
    const res = mockRes();
    clearRefreshTokenCookie(res as unknown as Response);
    expect(res.clearCookie).toHaveBeenCalledWith('7care_refresh_token', { path: '/api/auth' });
  });

  it('getRefreshTokenFromCookie reads the cookie', () => {
    const req = mockReq({ cookies: { '7care_refresh_token': 'tok-123' } } as Partial<AuthenticatedRequest>);
    expect(getRefreshTokenFromCookie(req)).toBe('tok-123');
  });

  it('returns undefined when cookie missing', () => {
    const req = mockReq({ cookies: {} } as Partial<AuthenticatedRequest>);
    expect(getRefreshTokenFromCookie(req)).toBeUndefined();
  });
});

// ─── requireJwtAuth middleware ───────────────────────────────────
describe('requireJwtAuth', () => {
  let res: ReturnType<typeof mockRes>;
  let next: NextFunction;

  beforeEach(() => {
    res = mockRes();
    next = vi.fn();
    mockVerifyAccessToken.mockReset();
    mockIsBlacklisted.mockReturnValue(false);
    mockGetUserById.mockReset();
  });

  it('rejects when no Authorization header', async () => {
    const req = mockReq();
    await requireJwtAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when Authorization header is not Bearer', async () => {
    const req = mockReq({ headers: { authorization: 'Basic abc' } } as Partial<AuthenticatedRequest>);
    await requireJwtAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects blacklisted token', async () => {
    mockIsBlacklisted.mockReturnValue(true);
    const req = mockReq({ headers: { authorization: 'Bearer blacklisted-tok' } } as Partial<AuthenticatedRequest>);
    await requireJwtAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
    expect(body.error).toContain('revogado');
  });

  it('rejects invalid/expired token', async () => {
    mockVerifyAccessToken.mockReturnValue(null);
    const req = mockReq({ headers: { authorization: 'Bearer expired-tok' } } as Partial<AuthenticatedRequest>);
    await requireJwtAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects when user not found in DB', async () => {
    mockVerifyAccessToken.mockReturnValue(validPayload);
    mockGetUserById.mockResolvedValue(null);
    const req = mockReq({ headers: { authorization: 'Bearer valid-tok' } } as Partial<AuthenticatedRequest>);
    await requireJwtAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
    expect(body.error).toContain('não encontrado');
  });

  it('rejects inactive user', async () => {
    mockVerifyAccessToken.mockReturnValue(validPayload);
    mockGetUserById.mockResolvedValue({ ...activeUser, status: 'inactive' });
    const req = mockReq({ headers: { authorization: 'Bearer valid-tok' } } as Partial<AuthenticatedRequest>);
    await requireJwtAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
    expect(body.error).toContain('desativada');
  });

  it('allows valid token + active user and populates req', async () => {
    mockVerifyAccessToken.mockReturnValue(validPayload);
    mockGetUserById.mockResolvedValue(activeUser);
    const req = mockReq({ headers: { authorization: 'Bearer valid-tok' } } as Partial<AuthenticatedRequest>);
    await requireJwtAuth(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(1);
    expect(req.userRole).toBe('member');
    expect(req.user).toEqual({
      id: 1,
      email: 'user@test.com',
      role: 'member',
      name: 'Test User',
      church: 'Test Church',
      districtId: 10,
    });
  });
});

// ─── optionalJwtAuth middleware ─────────────────────────────────
describe('optionalJwtAuth', () => {
  let res: ReturnType<typeof mockRes>;
  let next: NextFunction;

  beforeEach(() => {
    res = mockRes();
    next = vi.fn();
    mockVerifyAccessToken.mockReset();
    mockGetUserById.mockReset();
  });

  it('calls next without populating user when no token', async () => {
    const req = mockReq();
    await optionalJwtAuth(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBeUndefined();
  });

  it('populates user when valid token exists', async () => {
    mockVerifyAccessToken.mockReturnValue(validPayload);
    mockGetUserById.mockResolvedValue(activeUser);
    const req = mockReq({ headers: { authorization: 'Bearer valid-tok' } } as Partial<AuthenticatedRequest>);
    await optionalJwtAuth(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(1);
  });

  it('calls next without user when token is invalid', async () => {
    mockVerifyAccessToken.mockReturnValue(null);
    const req = mockReq({ headers: { authorization: 'Bearer bad-tok' } } as Partial<AuthenticatedRequest>);
    await optionalJwtAuth(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBeUndefined();
  });

  it('skips inactive user but still calls next', async () => {
    mockVerifyAccessToken.mockReturnValue(validPayload);
    mockGetUserById.mockResolvedValue({ ...activeUser, status: 'inactive' });
    const req = mockReq({ headers: { authorization: 'Bearer tok' } } as Partial<AuthenticatedRequest>);
    await optionalJwtAuth(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBeUndefined();
  });
});

// ─── requireRole middleware ─────────────────────────────────────
describe('requireRole', () => {
  let res: ReturnType<typeof mockRes>;
  let next: NextFunction;

  beforeEach(() => {
    res = mockRes();
    next = vi.fn();
  });

  it('returns 401 when user not authenticated', async () => {
    const middleware = requireRole('superadmin');
    const req = mockReq();
    await middleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has wrong role', async () => {
    const middleware = requireRole('superadmin');
    const req = mockReq();
    req.user = { id: 1, email: 'a@b.com', role: 'member', name: 'X' };
    req.userRole = 'member';
    req.userId = 1;
    await middleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows user with matching role', async () => {
    const middleware = requireRole('superadmin', 'pastor');
    const req = mockReq();
    req.user = { id: 1, email: 'a@b.com', role: 'pastor', name: 'X' };
    req.userRole = 'pastor';
    req.userId = 1;
    await middleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
