import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One rich description per scholarship, instead of three plain-text boxes and a
 * number.
 *
 * `eligibility_i18n`, `benefits_i18n` and `amount` were separate columns so that
 * an applicant scanning for whether they qualify would not have to read prose.
 * The editor is now a rich text field, which can carry its own headings — so the
 * structure that justified separate columns is available inside the one column,
 * and RMC can shape a scholarship's page rather than fill in a fixed form.
 *
 * ── The content is folded in, not dropped ────────────────────────────────────
 *
 * These columns hold authored copy on live rows, so `up()` appends what is there
 * to the description before removing anything. Whoever wrote "Rwandan Muslim
 * students entering S4 with an average above 60%" does not have to write it
 * again, and can delete the heading if they would rather say it differently.
 *
 * ── Plain text becomes HTML ──────────────────────────────────────────────────
 *
 * The description was rendered with `whitespace-pre-line`; it is now rendered as
 * HTML. Left alone, every existing paragraph break would collapse into one
 * run-on block — so the existing text is converted, blank-line-separated blocks
 * to <p>, single newlines to <br>, and the four HTML-significant characters
 * escaped. Text that happens to contain a `<` is content, not markup.
 *
 * ── What down() can and cannot do ────────────────────────────────────────────
 *
 * It restores the three columns, so the schema goes back exactly. It cannot
 * unpick the appended sections from the description — the text has been one
 * field since `up()` ran, and anything RMC has edited since would be guesswork
 * to split. The columns come back empty and the copy stays where it is, which
 * loses no words. Said plainly here rather than discovered later.
 */

interface I18n {
  en: string;
  rw: string;
  ar: string;
}

const LANGS: (keyof I18n)[] = ['en', 'rw', 'ar'];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Text that is already markup, rather than prose to be converted.
 *
 * A migration is normally the first thing to touch a column, so "everything here
 * is plain text" looks safe. It is not: the code that writes rich text can reach
 * the database first — a rolling deploy, a dev server hot-reloading a branch, an
 * admin who saved while the migration was still queued. When that happens,
 * escaping the row turns `<h6><strong>Title</strong></h6>` into visible angle
 * brackets, and the author's formatting is gone with no error anywhere.
 *
 * Cheap to check and cheap to be wrong about in this direction: prose that
 * happens to contain a literal `<p>` is not something an applicant reads.
 */
const LOOKS_LIKE_HTML =
  /<\/?(p|h[1-6]|ul|ol|li|strong|em|b|i|a|br|blockquote|img|div|span)\b[^>]*>/i;

/** Authored plain text → the paragraph markup the editor would have produced. */
function htmlFromPlain(text: string): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '';
  if (LOOKS_LIKE_HTML.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n\s*\n/)
    .map((block) => `<p>${escapeHtml(block.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function section(heading: string, body: string): string {
  const html = htmlFromPlain(body);
  return html ? `<h3>${heading}</h3>${html}` : '';
}

type ProgramRow = {
  id: string;
  description: string | null;
  description_i18n: I18n | null;
  eligibility_i18n: I18n | null;
  benefits_i18n: I18n | null;
  amount: string | null;
};

export class ScholarshipSingleDescription1790000000081 implements MigrationInterface {
  name = 'ScholarshipSingleDescription1790000000081';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: ProgramRow[] = await queryRunner.query(`
      SELECT id, description, description_i18n, eligibility_i18n, benefits_i18n, amount
      FROM scholarship_programs
    `);

    for (const row of rows) {
      // The award figure has no language, so it reads the same in every one.
      const award =
        row.amount != null && Number(row.amount) > 0
          ? section('Award', `${Number(row.amount).toLocaleString('en-US')} RWF`)
          : '';

      const fallbackBase = htmlFromPlain(row.description ?? '');

      const merged: I18n = { en: '', rw: '', ar: '' };
      for (const lang of LANGS) {
        const base = htmlFromPlain(row.description_i18n?.[lang] ?? '');
        const eligibility = section('Who may apply', row.eligibility_i18n?.[lang] ?? '');
        const benefits = section('What the award covers', row.benefits_i18n?.[lang] ?? '');

        // English is always materialised, even when the row only ever had the
        // single-language `description` column. The admin form edits the three
        // language tabs and treats English as the required one, so a row whose
        // text lived only in the fallback would open with an empty editor and
        // refuse to save — a scholarship visible to the public that its own
        // author cannot edit.
        //
        // rw and ar are NOT filled the same way: they stay empty so they keep
        // falling back to `description` exactly as today. Copying English into
        // the Arabic slot would turn a fallback into a claim of translation.
        if (lang !== 'en' && !base && !eligibility && !benefits) {
          merged[lang] = '';
          continue;
        }

        // Sections need something to hang under: a language that had eligibility
        // but no description of its own borrows the fallback, or the headings
        // would open the page with no lede.
        merged[lang] = `${base || fallbackBase}${eligibility}${benefits}${award}`;
      }

      await queryRunner.query(
        `UPDATE scholarship_programs SET description = $1, description_i18n = $2 WHERE id = $3`,
        [
          // The fallback carries the award too — it is what a locale with no
          // translation renders, and the figure was public on that page before.
          `${fallbackBase}${award}`,
          JSON.stringify(merged),
          row.id,
        ],
      );
    }

    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        DROP COLUMN IF EXISTS "eligibility_i18n",
        DROP COLUMN IF EXISTS "benefits_i18n",
        DROP COLUMN IF EXISTS "amount"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Schema back exactly; see the note above on why the copy stays in the
    // description rather than being split back out.
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        ADD COLUMN IF NOT EXISTS "eligibility_i18n" jsonb,
        ADD COLUMN IF NOT EXISTS "benefits_i18n" jsonb,
        ADD COLUMN IF NOT EXISTS "amount" numeric(12,2)
    `);
  }
}
