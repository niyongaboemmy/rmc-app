import { YoutubeProvider } from './youtube.provider';

const CHANNEL_ID = 'UC8Wm3_vrV1v44QJv78YatPQ';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <title>IslamRwanda</title>
  <entry>
    <yt:videoId>pnzEPwXTHNY</yt:videoId>
    <title>Gusoza amahugurwa y'Urubyiruko</title>
    <author><name>IslamRwanda</name></author>
    <published>2026-08-31T18:27:08+00:00</published>
    <media:group><media:thumbnail url="https://i.ytimg.com/vi/pnzEPwXTHNY/hqdefault.jpg"/></media:group>
  </entry>
  <entry>
    <yt:videoId>4FDRlpk8JN4</yt:videoId>
    <title>RMC &amp; MBC Hospital</title>
    <author><name>IslamRwanda</name></author>
    <published>2026-08-09T20:00:46+00:00</published>
    <media:group><media:thumbnail url="https://i.ytimg.com/vi/4FDRlpk8JN4/hqdefault.jpg"/></media:group>
  </entry>
</feed>`;

const API_KEY_INVALID = JSON.stringify({
  error: { code: 400, message: 'API key not valid. Please pass a valid API key.' },
});

type Route = (url: string) => { status?: number; body: string };

/** Route global fetch by URL; unmatched URLs 404 so a stray call surfaces. */
function mockFetch(routes: Array<[RegExp, Route]>) {
  const calls: string[] = [];
  global.fetch = jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const hit = routes.find(([re]) => re.test(url));
    const { status = 200, body } = hit ? hit[1](url) : { status: 404, body: '' };
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Bad Request',
      text: async () => body,
      json: async () => JSON.parse(body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return calls;
}

function build(env: { apiKey?: string; channelId?: string }) {
  const values: Record<string, string> = {
    'social.youtube.apiKey': env.apiKey ?? '',
    'social.youtube.channelId': env.channelId ?? '',
  };
  const config = { get: (key: string, def: string) => values[key] ?? def };
  return new YoutubeProvider(config as never);
}

const rssRoutes: Array<[RegExp, Route]> = [
  [/feeds\/videos\.xml\?channel_id=/, () => ({ body: RSS })],
  // Channel page scrape for the subscriber count.
  [/youtube\.com\/channel\//, () => ({ body: '"content":"386 subscribers"' })],
];

describe('YoutubeProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the key-less RSS feed when no API key is configured', async () => {
    const calls = mockFetch(rssRoutes);
    const provider = build({ channelId: CHANNEL_ID });

    const result = await provider.fetch(12);

    expect(result.posts.map((p) => p.url)).toEqual([
      'https://www.youtube.com/watch?v=pnzEPwXTHNY',
      'https://www.youtube.com/watch?v=4FDRlpk8JN4',
    ]);
    expect(result.channel).toMatchObject({ key: 'youtube', label: 'IslamRwanda', followers: 386 });
    expect(calls.some((u) => u.includes('googleapis.com'))).toBe(false);
  });

  /**
   * Regression: production shipped with YOUTUBE_API_KEY=REPLACE_ME. The
   * non-empty placeholder routed every poll to the Data API, Google answered
   * 400 "API key not valid", the whole YouTube result was dropped and the
   * home page showed "No video to show right now" for weeks. A broken key
   * must cost us the like counts, not the video.
   */
  it('falls back to RSS when the Data API rejects the key', async () => {
    const calls = mockFetch([
      [/googleapis\.com\/youtube\/v3\//, () => ({ status: 400, body: API_KEY_INVALID })],
      ...rssRoutes,
    ]);
    const provider = build({ apiKey: 'REPLACE_ME', channelId: CHANNEL_ID });

    const result = await provider.fetch(12);

    expect(calls[0]).toContain('googleapis.com/youtube/v3/channels');
    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]).toMatchObject({
      platform: 'youtube',
      url: 'https://www.youtube.com/watch?v=pnzEPwXTHNY',
      text: "Gusoza amahugurwa y'Urubyiruko",
      publishedAt: '2026-08-31T18:27:08+00:00',
      likes: 0,
    });
    expect(result.channel).toMatchObject({ key: 'youtube', label: 'IslamRwanda' });
  });

  it('serves the Data API result, with engagement counts, when the key works', async () => {
    const calls = mockFetch([
      [
        /youtube\/v3\/channels/,
        () => ({
          body: JSON.stringify({
            items: [
              {
                snippet: { title: 'IslamRwanda', customUrl: '@islamrwanda6069' },
                statistics: { subscriberCount: '386' },
                contentDetails: { relatedPlaylists: { uploads: 'UU8Wm3_vrV1v44QJv78YatPQ' } },
              },
            ],
          }),
        }),
      ],
      [
        /youtube\/v3\/playlistItems/,
        () => ({
          body: JSON.stringify({
            items: [
              {
                snippet: {
                  title: 'Latest',
                  publishedAt: '2026-08-31T18:27:08Z',
                  channelTitle: 'IslamRwanda',
                  thumbnails: { high: { url: 'https://i.ytimg.com/vi/pnzEPwXTHNY/hqdefault.jpg' } },
                },
                contentDetails: { videoId: 'pnzEPwXTHNY' },
              },
            ],
          }),
        }),
      ],
      [
        /youtube\/v3\/videos/,
        () => ({
          body: JSON.stringify({
            items: [{ id: 'pnzEPwXTHNY', statistics: { likeCount: '42', commentCount: '7' } }],
          }),
        }),
      ],
    ]);
    const provider = build({ apiKey: 'real-key', channelId: CHANNEL_ID });

    const result = await provider.fetch(12);

    expect(result.posts).toEqual([
      expect.objectContaining({
        url: 'https://www.youtube.com/watch?v=pnzEPwXTHNY',
        likes: 42,
        comments: 7,
      }),
    ]);
    expect(result.channel).toMatchObject({
      followers: 386,
      href: 'https://www.youtube.com/@islamrwanda6069',
    });
    expect(calls.some((u) => u.includes('feeds/videos.xml'))).toBe(false);
  });
});
