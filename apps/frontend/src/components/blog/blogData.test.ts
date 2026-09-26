import { blogUrlSlug, BLOG_DEFAULT, type BlogContent } from '@/lib/content-api';
import { getPost, resolvePosts } from './blogData';

let mockSaved: BlogContent | null = null;
jest.mock('@/lib/content-api', () => ({
  ...jest.requireActual('@/lib/content-api'),
  getSiteContent: () => Promise.resolve(mockSaved),
}));

/** The seed's first post, re-slugged the way an admin had typed it on production. */
function savedWithSlugs(...slugs: string[]): BlogContent {
  return {
    posts: slugs.map((slug) => ({ ...BLOG_DEFAULT.posts[0], slug })),
  };
}

describe('blogUrlSlug', () => {
  it('turns free-text slugs into URL-safe ones', () => {
    expect(blogUrlSlug('EID AL ADHA CELEBRATION 2026-1447')).toBe('eid-al-adha-celebration-2026-1447');
    expect(blogUrlSlug('Rwandan Muslim Community #MeetThePresident')).toBe(
      'rwandan-muslim-community-meetthepresident',
    );
  });

  it('leaves a clean slug alone', () => {
    expect(blogUrlSlug('youth-leadership-camp-2026')).toBe('youth-leadership-camp-2026');
  });

  it('keeps a slug with nothing URL-safe in it', () => {
    expect(blogUrlSlug('عيد الأضحى')).toBe('عيد الأضحى');
  });
});

describe('blog post links', () => {
  afterEach(() => {
    mockSaved = null;
  });

  it('links a free-text slug by its URL form', () => {
    const [post] = resolvePosts(savedWithSlugs('Rwandan Muslim Community #MeetThePresident'), 'en');

    expect(post.slug).toBe('rwandan-muslim-community-meetthepresident');
  });

  it('opens the post from its clean link', async () => {
    mockSaved = savedWithSlugs('EID AL ADHA CELEBRATION 2026-1447');

    expect(await getPost('en', 'eid-al-adha-celebration-2026-1447')).toBeDefined();
  });

  it('opens the post from an old link that spelled the slug out', async () => {
    mockSaved = savedWithSlugs('EID AL ADHA CELEBRATION 2026-1447');

    // Next passes the dynamic segment through still percent-encoded.
    expect(await getPost('en', 'EID%20AL%20ADHA%20CELEBRATION%202026-1447')).toBeDefined();
  });

  it('opens an Arabic-only slug from its encoded URL', async () => {
    mockSaved = savedWithSlugs('عيد الأضحى');

    expect(await getPost('ar', encodeURIComponent('عيد الأضحى'))).toBeDefined();
  });

  it('still 404s a slug no post has', async () => {
    mockSaved = savedWithSlugs('EID AL ADHA CELEBRATION 2026-1447');

    expect(await getPost('en', 'no-such-post')).toBeUndefined();
  });

  it('keeps a built-in article reachable after an editor writes over it', async () => {
    // Production: the seeded Qur'an article was edited into the Eid post, and
    // links to /blog/free-translated-quran-initiative started to 404.
    mockSaved = {
      posts: [{ ...BLOG_DEFAULT.posts[0], slug: 'EID-AL-ADHA-CELEBRATION-2026-1447', title: { en: 'Eid', rw: '', ar: '' } }],
    };

    const post = await getPost('en', 'free-translated-quran-initiative');

    expect(post?.title).toBe(BLOG_DEFAULT.posts[0].title.en);
  });

  it('prefers a current post over the built-in one with the same slug', async () => {
    mockSaved = {
      posts: [{ ...BLOG_DEFAULT.posts[0], title: { en: 'Edited in the CMS', rw: '', ar: '' } }],
    };

    const post = await getPost('en', BLOG_DEFAULT.posts[0].slug);

    expect(post?.title).toBe('Edited in the CMS');
  });
});
