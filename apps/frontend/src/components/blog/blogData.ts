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
  let content: BlogContent = BLOG_DEFAULT;
  try {
    const saved = await getSiteContent<BlogContent>(ContentKeys.blog);
    if (saved) content = mergeContent(BLOG_DEFAULT, saved);
  } catch {
    // Backend unreachable or section unset — fall back to the seeded defaults.
  }

  return content.posts
    .filter((p) => (p.status ?? 'published') === 'published')
    .map((p) => {
      const summary = pick(p.summary, locale);
      const bodyHtml = blogBodyHtml(p, locale);
      return {
        slug: p.slug,
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

/** A single localized published post by slug. */
export async function getPost(locale: string, slug: string): Promise<BlogPost | undefined> {
  const posts = await loadPosts(locale);
  return posts.find((p) => p.slug === slug);
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
