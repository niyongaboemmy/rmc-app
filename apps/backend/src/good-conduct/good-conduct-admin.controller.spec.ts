import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/types/permissions.enum';
import { GoodConductAdminController } from './good-conduct-admin.controller';

/**
 * Exercises the REAL @Permissions metadata declared on each admin route
 * handler (not a mocked reflector) through the REAL PermissionsGuard, so a
 * regression that removes/loosens a decorator on any route is caught here.
 */
function makeCtx(
  handlerName: keyof GoodConductAdminController,
  user: object | null,
): ExecutionContext {
  const handler = (GoodConductAdminController.prototype as unknown as Record<string, () => void>)[
    handlerName
  ];
  return {
    getHandler: () => handler,
    getClass: () => GoodConductAdminController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const ADMIN_ROUTE_HANDLERS: Array<keyof GoodConductAdminController> = [
  'findAll',
  'findOne',
  'updateStatus',
  'assignImam',
  'confirmPayment',
  'issueCertificate',
  'getReports',
  'exportCsv',
];

describe('GoodConductAdminController permission wiring', () => {
  let guard: PermissionsGuard;

  beforeEach(() => {
    guard = new PermissionsGuard(new Reflector());
  });

  it.each(ADMIN_ROUTE_HANDLERS)(
    'denies a user with no good_conduct permissions on %s',
    (handlerName) => {
      const ctx = makeCtx(handlerName, { role: 'user', permissions: [] });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    },
  );

  it.each(['findAll', 'findOne'] as const)('allows GOOD_CONDUCT_VIEW on %s', (handlerName) => {
    const ctx = makeCtx(handlerName, {
      role: 'good_conduct_officer',
      permissions: [Permission.GOOD_CONDUCT_VIEW],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies GOOD_CONDUCT_VIEW-only user on updateStatus (requires APPROVE)', () => {
    const ctx = makeCtx('updateStatus', { role: 'x', permissions: [Permission.GOOD_CONDUCT_VIEW] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows GOOD_CONDUCT_APPROVE on updateStatus', () => {
    const ctx = makeCtx('updateStatus', {
      role: 'x',
      permissions: [Permission.GOOD_CONDUCT_APPROVE],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it.each(['assignImam', 'confirmPayment'] as const)(
    'requires GOOD_CONDUCT_MANAGE on %s',
    (handlerName) => {
      const denied = makeCtx(handlerName, {
        role: 'x',
        permissions: [Permission.GOOD_CONDUCT_VIEW],
      });
      expect(() => guard.canActivate(denied)).toThrow(ForbiddenException);

      const allowed = makeCtx(handlerName, {
        role: 'x',
        permissions: [Permission.GOOD_CONDUCT_MANAGE],
      });
      expect(guard.canActivate(allowed)).toBe(true);
    },
  );

  it('requires GOOD_CONDUCT_CERTIFICATE on issueCertificate', () => {
    const denied = makeCtx('issueCertificate', {
      role: 'x',
      permissions: [Permission.GOOD_CONDUCT_MANAGE],
    });
    expect(() => guard.canActivate(denied)).toThrow(ForbiddenException);

    const allowed = makeCtx('issueCertificate', {
      role: 'x',
      permissions: [Permission.GOOD_CONDUCT_CERTIFICATE],
    });
    expect(guard.canActivate(allowed)).toBe(true);
  });

  it.each(['getReports', 'exportCsv'] as const)(
    'requires GOOD_CONDUCT_REPORTS on %s',
    (handlerName) => {
      const denied = makeCtx(handlerName, {
        role: 'x',
        permissions: [Permission.GOOD_CONDUCT_VIEW],
      });
      expect(() => guard.canActivate(denied)).toThrow(ForbiddenException);

      const allowed = makeCtx(handlerName, {
        role: 'x',
        permissions: [Permission.GOOD_CONDUCT_REPORTS],
      });
      expect(guard.canActivate(allowed)).toBe(true);
    },
  );

  it('superadmin passes every route regardless of permissions array', () => {
    for (const handlerName of ADMIN_ROUTE_HANDLERS) {
      const ctx = makeCtx(handlerName, { role: 'superadmin', permissions: [] });
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });
});
