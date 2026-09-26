// Blog data layer — reads posts from the CMS (Admin → Content → Blog & Posts),
// falling back to the seeded defaults when the section hasn't been saved yet.
// `BlogPost` is the resolved, single-locale shape the public blog UI renders.

import {
  ContentKeys,
  getSiteContent,
  mergeContent,
  pick,
  BLOG_DEFAULT,
  resolveBlogImage,
  blogBodyHtml,
  blogUrlSlug,
  type BlogContent,
} from '@/lib/content-api';

export interface BlogPost {
  slug: string;
  image: string;
  date: string; // ISO date
  title: string;
  excerpt: string;
  summary: string;
  category: string;
  author: string;
  /** Rendered body HTML — rich-text editor output (or wrapped legacy text). */
  bodyHtml: string;
}

/** Load published posts for a locale, newest first, merged over the seed. */
async function loadPosts(locale: string): Promise<BlogPost[]> {
  let saved: BlogContent | null = null;
  try {
    saved = await getSiteContent<BlogContent>(ContentKeys.blog);
  } catch {
    // Backend unreachable or section unset — fall back to the seeded defaults.
  }
  return resolvePosts(saved, locale);
}

/**
 * Localize an already-fetched Blog & Posts blob: published posts only, newest
 * first, merged over the seed. For callers that read the store themselves (the
 * home page shares one site-content request across all its sections).
 */
export function resolvePosts(saved: BlogContent | null | undefined, locale: string): BlogPost[] {
  const content = saved ? mergeContent(BLOG_DEFAULT, saved) : BLOG_DEFAULT;

  return content.posts
    .filter((p) => (p.status ?? 'published') === 'published')
    .map((p) => {
      const summary = pick(p.summary, locale);
      const bodyHtml = blogBodyHtml(p, locale);
      return {
        slug: blogUrlSlug(p.slug),
        image: resolveBlogImage(p.image),
        date: p.date,
        title: pick(p.title, locale),
        excerpt: pick(p.excerpt, locale),
        summary,
        category: pick(p.category, locale),
        author: pick(p.author, locale),
        bodyHtml: bodyHtml || `<p>${summary}</p>`,
      };
    })
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** Localized published posts for a given locale (newest first). */
export async function getPosts(locale: string): Promise<BlogPost[]> {
  return loadPosts(locale);
}

/**
 * A single localized published post by the slug in its URL. The route hands the
 * segment over still percent-encoded, so decode it and put it through the same
 * `blogUrlSlug` the links were built with — old links that spelled a slug out
 * with spaces or capitals resolve too.
 */
export async function getPost(locale: string, slug: string): Promise<BlogPost | undefined> {
  let requested = slug;
  try {
    requested = decodeURIComponent(slug);
  } catch {
    // Malformed escape sequence — match the segment as it came.
  }
  const wanted = blogUrlSlug(requested);
  const posts = await loadPosts(locale);
  return (
    posts.find((p) => p.slug === wanted) ??
    // A built-in article an editor has since written over keeps its address:
    // links to it were shared (and indexed) before the edit, and should still
    // open it rather than 404. A current post with the same slug always wins.
    resolvePosts(null, locale).find((p) => p.slug === wanted)
  );
}

/** Estimated reading time in minutes (min 1), ~200 words/min over title + body. */
export function readingMinutes(post: BlogPost): number {
  const bodyText = post.bodyHtml.replace(/<[^>]+>/g, ' ');
  const words = [post.title, bodyText]
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
