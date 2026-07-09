import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../decorators/roles.decorator';

const createMockContext = (userRole: Role | null): ExecutionContext => {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user: userRole ? { role: userRole } : null }),
    }),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockReflector = (roles: Role[] | null): void => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles ?? undefined);
  };

  it('should allow user with exact required role', () => {
    mockReflector([Role.USER]);
    const ctx = createMockContext(Role.USER);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow superadmin on admin-only route (hierarchy)', () => {
    mockReflector([Role.ADMIN]);
    const ctx = createMockContext(Role.SUPERADMIN);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow admin on operator-only route (hierarchy)', () => {
    mockReflector([Role.OPERATOR]);
    const ctx = createMockContext(Role.ADMIN);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny operator on admin-only route → 403', () => {
    mockReflector([Role.ADMIN]);
    const ctx = createMockContext(Role.OPERATOR);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should deny user on operator-only route → 403', () => {
    mockReflector([Role.OPERATOR]);
    const ctx = createMockContext(Role.USER);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should deny user on superadmin-only route → 403', () => {
    mockReflector([Role.SUPERADMIN]);
    const ctx = createMockContext(Role.USER);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow access to routes with no @Roles() decorator', () => {
    mockReflector(null);
    const ctx = createMockContext(Role.USER);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return 403 with AUTH_INSUFFICIENT_ROLE error code', () => {
    mockReflector([Role.ADMIN]);
    const ctx = createMockContext(Role.USER);
    try {
      guard.canActivate(ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      const resp = (e as ForbiddenException).getResponse() as Record<string, string>;
      expect(resp.code).toBe('AUTH_INSUFFICIENT_ROLE');
    }
  });
});
