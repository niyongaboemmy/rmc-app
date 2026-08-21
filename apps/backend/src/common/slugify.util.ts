/**
 * Canonical slug generation for every module that puts a title in a URL.
 *
 * Promoted here from `dawah/dawah-slug.util.ts`, whose own comment made the case:
 * a slug must be byte-identical wherever it is produced, and "two near-copies
 * that drift is how you end up with a course and a book whose 'same' title
 * yields different URLs". Scholarship opportunities would have been the third
 * copy. `dawah-slug.util.ts` now re-exports this one.
 *
 * (`public.service.ts` still carries a private copy for announcements/tenders.
 * It is character-for-character the same; folding it in means touching tender
 * slug generation, which is left for a deliberate change rather than a drive-by.)
 *
 * NFKD alone decomposes "naïve" to "nai" + combining diaeresis + "ve", and the
 * leftover mark would then match the non-alphanumeric class and become a
 * separator — "nai-ve", not "naive". So the marks are stripped explicitly.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      // Drop combining diacritical marks left behind by the decomposition, so the
      // base letter survives instead of being split around them.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      // Typographic apostrophes are common here — "Qur’an" must slug to "quran",
      // not "qur-an". Delete them rather than treat them as a separator.
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 130)
  );
}
