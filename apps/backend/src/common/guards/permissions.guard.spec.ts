import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from '../types/permissions.enum';

function makeCtx(user: object | null): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('returns true when no permissions are required on the route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeCtx({ role: 'user', permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when required permissions array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const ctx = makeCtx({ role: 'user', permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true for superadmin regardless of required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.SYSTEM_SETTINGS, Permission.ROLES_DELETE]);
    const ctx = makeCtx({ role: 'superadmin', permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when user has all required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.MEMBERS_VIEW]);
    const ctx = makeCtx({
      role: 'operator',
      permissions: [Permission.MEMBERS_VIEW, Permission.CONTENT_VIEW],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user is missing a required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ROLES_DELETE]);
    const ctx = makeCtx({ role: 'operator', permissions: [Permission.MEMBERS_VIEW] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is null', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.MEMBERS_VIEW]);
    const ctx = makeCtx(null);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('returns true when wildcard "*" permission is present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.SYSTEM_SETTINGS]);
    const ctx = makeCtx({ role: 'admin', permissions: ['*'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('handles multiple required permissions — all must be present', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.USERS_VIEW, Permission.USERS_EDIT]);
    // only has USERS_VIEW, missing USERS_EDIT
    const ctx = makeCtx({ role: 'operator', permissions: [Permission.USERS_VIEW] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
