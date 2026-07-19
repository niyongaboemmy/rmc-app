import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getPosts, getPost, readingMinutes } from '@/components/blog/blogData';

// Render on-demand like the rest of the app (gallery, about). The route lives
// under a dynamic [locale] segment, so partial static generation of [slug]
// alone left the locale undefined and 500'd on the deployed standalone server.
export const dynamic = 'force-dynamic';

export default async function BlogPostPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const post = await getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations('blog');
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const isAr = locale === 'ar';
  const minutes = readingMinutes(post);
  const more = (await getPosts(locale)).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Solid navbar: with the image hero gone, a transparent bar would put
          white links on the light page and read as invisible. */}
      <Navbar solid />
      <main>
        {/* Article header — compact, on the light page (no image hero); pt
            clears the fixed navbar. */}
        <article>
          <div className="px-4 sm:px-6 lg:px-8 pt-24 md:pt-28">
            <div className="mx-auto max-w-3xl">
              <Link
                href={`/${locale}/blog`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-rmc-green"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                {t('back')}
              </Link>
              {/* Header card — background + borders matching the course detail page */}
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm md:p-5">
                {post.category && (
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">
                    {post.category}
                  </p>
                )}
                <h1 className="mt-1.5 text-lg font-bold leading-tight text-rmc-green-deep md:text-xl">
                  {post.title}
                </h1>
                {post.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 md:text-base">
                    {post.summary}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-gray-200 pt-4 text-sm text-gray-500">
                  {post.author && (
                    <span className="inline-flex items-center gap-2.5">
                      <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-rmc-green to-rmc-gold text-white text-xs font-bold ring-2 ring-rmc-gold/30 shadow-sm">
                        {post.author.charAt(0)}
                      </span>
                      <span className="font-semibold text-gray-900">{post.author}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-rmc-green" />
                    <time dateTime={post.date}>{dateFmt.format(new Date(post.date))}</time>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rmc-green" />
                    {t('minRead', { count: minutes })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="px-4 sm:px-6 lg:px-8 mt-8">
            <div className="max-w-3xl mx-auto relative aspect-[16/9] overflow-hidden rounded-lg shadow-[0_30px_70px_-30px_rgba(13,61,36,0.5)] ring-1 ring-black/5">
              <Image
                src={post.image}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 lg:px-8 py-12">
            <div
              dir={isAr ? 'rtl' : 'ltr'}
              className={`prose prose-lg max-w-3xl mx-auto text-gray-700 leading-relaxed prose-headings:text-gray-900 prose-a:text-rmc-green prose-strong:text-gray-900 prose-blockquote:border-rmc-gold ${
                isAr
                  ? 'font-arabic first-letter:float-right first-letter:ml-3'
                  : 'first-letter:float-left first-letter:mr-3'
              } first-letter:mt-1 first-letter:text-5xl first-letter:font-bold first-letter:leading-[0.75] first-letter:text-rmc-green`}
              dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
            />
            <div className="max-w-3xl mx-auto">
              <div className="ornament-divider max-w-xs mx-auto pt-8">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
              </div>
            </div>
          </div>
        </article>

        {/* More articles */}
        {more.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 pb-16 pt-4 bg-rmc-green/[0.03] border-t border-rmc-green/10">
            <div className="max-w-7xl mx-auto py-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">{t('more')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {more.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/${locale}/blog/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-rmc-green/50 hover:shadow-[0_24px_50px_-28px_rgba(13,61,36,0.3)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-3 left-3 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <time dateTime={p.date} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <CalendarDays className="h-3.5 w-3.5 text-rmc-green" />
                        {dateFmt.format(new Date(p.date))}
                      </time>
                      <h3 className="mt-2 font-bold text-gray-900 leading-snug transition-colors group-hover:text-rmc-green line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2">{p.summary}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green">
                        {t('readMore')}
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
