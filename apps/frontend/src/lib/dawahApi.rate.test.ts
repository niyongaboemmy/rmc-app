const post = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { create: () => ({ post, get: jest.fn() }) },
}));
jest.mock('./api', () => ({
  API_BASE_URL: 'http://test/api/v1',
  apiClient: { post: jest.fn(), get: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  refreshAccessToken: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dawahApi } = require('./dawahApi') as typeof import('./dawahApi');

/**
 * The wire format for a rating, pinned.
 *
 * `helpful` goes over the wire as the STRING 'yes' or 'no', never a boolean. The backend's
 * global validation pipe runs with `enableImplicitConversion`, which coerces a boolean
 * field with `Boolean(value)` — and `Boolean("false")` is true. While this was a boolean
 * field, a client sending "false" had its "not helpful" recorded as helpful, answered with
 * a 200, and nothing anywhere reported a problem.
 *
 * A boolean sent from here is now rejected outright by the API (400), so an accidental
 * revert fails loudly rather than quietly inverting a reader's answer. This test is what
 * catches it before it ships.
 */
describe('dawahApi.discussions.rate', () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: { data: { recorded: true } } });
  });

  it('sends the verdict as the string "yes" or "no", never a boolean', async () => {
    await dawahApi.discussions.rate('wudu', true, 'token-0000-1111-2222');
    expect(post).toHaveBeenCalledWith('/dawah/discussions/wudu/rating', {
      helpful: 'yes',
      voterKey: 'token-0000-1111-2222',
    });

    post.mockClear();
    await dawahApi.discussions.rate('wudu', false, 'token-0000-1111-2222');
    expect(post).toHaveBeenCalledWith('/dawah/discussions/wudu/rating', {
      helpful: 'no',
      voterKey: 'token-0000-1111-2222',
    });

    // Explicitly not a boolean — the exact shape the backend cannot safely read.
    expect(typeof post.mock.calls[0][1].helpful).toBe('string');
  });

  it('posts to the slug it was given', async () => {
    await dawahApi.discussions.rate('zakat-on-savings', true, 'token-0000-1111-2222');
    expect(post.mock.calls[0][0]).toBe('/dawah/discussions/zakat-on-savings/rating');
  });
});
