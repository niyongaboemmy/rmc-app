import { sanitizeRedirect, getDashboardPath, resolvePostLoginPath } from './authRedirect';

describe('sanitizeRedirect', () => {
  it('accepts a same-origin, locale-prefixed path', () => {
    expect(sanitizeRedirect('/en/admin/drive')).toBe('/en/admin/drive');
    expect(sanitizeRedirect('/rw/profile')).toBe('/rw/profile');
  });

  it('decodes percent-encoded paths', () => {
    expect(sanitizeRedirect('/en/admin%2Fdrive')).toBe('/en/admin/drive');
  });

  it('rejects empty / missing input', () => {
    expect(sanitizeRedirect(null)).toBeNull();
    expect(sanitizeRedirect(undefined)).toBeNull();
    expect(sanitizeRedirect('')).toBeNull();
  });

  it('blocks open-redirect vectors', () => {
    expect(sanitizeRedirect('https://evil.com')).toBeNull();
    expect(sanitizeRedirect('//evil.com')).toBeNull();
    expect(sanitizeRedirect('/\\evil.com')).toBeNull();
    expect(sanitizeRedirect('/en/a\\b')).toBeNull();
    expect(sanitizeRedirect('javascript:alert(1)')).toBeNull();
    expect(sanitizeRedirect('relative/path')).toBeNull();
  });

  it('rejects malformed percent-encoding', () => {
    expect(sanitizeRedirect('/en/%E0%A4%A')).toBeNull();
  });

  it('refuses to loop back into auth-only pages', () => {
    expect(sanitizeRedirect('/en/login')).toBeNull();
    expect(sanitizeRedirect('/rw/register')).toBeNull();
    expect(sanitizeRedirect('/ar/forgot-password?x=1')).toBeNull();
  });
});

describe('getDashboardPath', () => {
  it('sends staff roles to the admin dashboard', () => {
    for (const role of ['operator', 'admin', 'superadmin', 'marriage_officer']) {
      expect(getDashboardPath({ role }, 'en')).toBe('/en/admin');
    }
  });

  it('sends members (role "user") to the member dashboard', () => {
    expect(getDashboardPath({ role: 'user' }, 'rw')).toBe('/rw/member/dashboard');
  });

  it('falls back to locale home for other roles and for no user', () => {
    expect(getDashboardPath({ role: 'good_conduct_officer' }, 'en')).toBe('/en');
    expect(getDashboardPath(null, 'ar')).toBe('/ar');
  });
});

describe('resolvePostLoginPath', () => {
  it('prefers a valid redirect over the dashboard', () => {
    expect(resolvePostLoginPath({ role: 'admin' }, '/en/admin/drive', 'en')).toBe('/en/admin/drive');
  });

  it('falls back to the dashboard when redirect is missing or unsafe', () => {
    expect(resolvePostLoginPath({ role: 'admin' }, null, 'en')).toBe('/en/admin');
    expect(resolvePostLoginPath({ role: 'user' }, 'https://evil.com', 'en')).toBe('/en/member/dashboard');
  });
});
