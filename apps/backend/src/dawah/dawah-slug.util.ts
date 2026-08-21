/**
 * Slug generation for courses, books and categories.
 *
 * Lives in its own file rather than as a private method (the shape
 * donations.service.ts:581 uses) only because three Dawah services need it and
 * a slug must be byte-identical across them — two near-copies that drift is how
 * you end up with a course and a book whose "same" title yields different URLs.
 *
 * Unlike the donations copy this strips combining marks explicitly. NFKD alone
 * decomposes "naïve" to "naïve", and the leftover diaeresis then matches
 * the non-alphanumeric class and becomes a separator — "nai-ve", not "naive".
 */
export function slugify(input: string): string {
  return input
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
    .slice(0, 130);
}
