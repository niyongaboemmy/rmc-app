import { Tri, tri } from './client';

/**
 * Community Discussions listing copy, admin-editable in place.
 *
 * As with `courses.ts`/`library.ts`, this holds ONLY the prose chrome around the
 * list — the header, the two empty-states (unfiltered vs filtered) and the error
 * state. The questions themselves are member-authored posts with their own table
 * and moderation; they are never CMS copy. Structural labels that are UI grammar
 * rather than editorial voice (filter placeholders, sort tabs, the "Ask" button,
 * per-card counts) stay in the i18n messages and are NOT surfaced here.
 *
 * Seeds are lifted verbatim from `dawah.discussions.*` in messages/{en,rw,ar}.json,
 * so switching the page from `t()` to this store is a no-op for every visitor
 * until an admin edits something.
 */
export interface DiscussionsContent {
  header: {
    title: Tri;
    subtitle: Tri;
  };
  /**
   * The two panel headings, and the sentence under the curated one.
   *
   * Editorial: "The Essential Answers" is a claim RMC makes about that collection,
   * and the sentence beneath explains what was selected and why. Both belong to an
   * editor rather than to the translation files, which is where UI grammar lives.
   */
  panels: {
    newTitle: Tri;
    mostReadTitle: Tri;
    essentialTitle: Tri;
    essentialBody: Tri;
  };
  /** Shown when the list is empty with no filters applied. */
  empty: {
    body: Tri;
  };
  /** Shown when filters are applied but nothing matches. */
  emptyFiltered: {
    body: Tri;
  };
  error: {
    body: Tri;
  };
  /**
   * The ENTRY page (/dawah/discussions/[slug]) — the chrome around one question and
   * RMC's answer to it.
   *
   * The same prose/grammar line as above decides what is here. RMC's own voice — the
   * badge over the answer, the invitation to ask, the question put to the reader after
   * they have read it — is editorial and belongs to an editor. The views count, the
   * "Yes"/"No" on the rating buttons and the rating's failure message are UI grammar and
   * stay in the i18n messages.
   *
   * Dashboard-only, unlike the listing: the entry page is a server component with no Edit
   * Mode wiring, so there is no in-place editing of these.
   */
  detail: {
    /** Sits over RMC's answer, marking it as the authoritative one. */
    answerBadge: Tri;
    /** The rating widget's question, asked after the reader has read the answer. */
    ratingPrompt: Tri;
    /** Replaces the buttons once a rating is recorded. */
    ratingThanks: Tri;
    /** Heading over the (up to three) entries offered to read next. */
    relatedTitle: Tri;
    /** The closing invitation, and its button. */
    askPrompt: Tri;
    askCta: Tri;
  };
}

export const DISCUSSIONS_DEFAULT: DiscussionsContent = {
  header: {
    title: tri('Discussions', 'Ibiganiro', 'النقاشات'),
    subtitle: tri(
      'Ask the community, and read what RMC scholars have answered.',
      'Baza umuryango, kandi usome ibyo inzobere za RMC zasubije.',
      'اسأل المجتمع، واقرأ إجابات علماء المجتمع الرواندي المسلم.',
    ),
  },
  panels: {
    newTitle: tri('New Answers', 'Ibisubizo bishya', 'أحدث الأجوبة'),
    mostReadTitle: tri('Most-Read', 'Ibisomwa cyane', 'الأكثر قراءة'),
    essentialTitle: tri('The Essential Answers', 'Ibisubizo by’ingenzi', 'الأجوبة الأساسية'),
    essentialBody: tri(
      'A carefully selected collection of essential answers from our website, to equip every Muslim with the foundational knowledge needed to worship Allah with true understanding and build a strong, well-rounded grasp of Islam.',
      'Ikusanyirizo ry’ibisubizo by’ingenzi byatoranyijwe mu buryo bwitondewe, kugira ngo buri Mwislamu abone ubumenyi shingiro bwo gusenga Allah mu kumva neza, no kubaka ubumenyi bukomeye kandi bwuzuye bwa Islamu.',
      'مجموعة مختارة بعناية من الأجوبة الأساسية من موقعنا، لتزويد كل مسلم بالمعرفة التأسيسية اللازمة لعبادة الله على فهم صحيح، وبناء تصوّر متين ومتكامل عن الإسلام.',
    ),
  },
  empty: {
    body: tri('No questions here yet.', 'Nta bibazo birahaba.', 'لا توجد أسئلة هنا بعد.'),
  },
  emptyFiltered: {
    body: tri(
      'No questions match these filters.',
      "Nta kibazo gihuye n'aya matonde.",
      'لا توجد أسئلة تطابق هذه الفلاتر.',
    ),
  },
  error: {
    body: tri(
      "We couldn't load the discussions. Please try again.",
      'Ntitwashoboye gutangiza ibiganiro. Ongera ugerageze.',
      'تعذّر تحميل النقاشات. حاول مرة أخرى.',
    ),
  },
  detail: {
    answerBadge: tri("RMC's answer", 'Igisubizo cya RMC', 'إجابة المجلس'),
    ratingPrompt: tri(
      'Was this answer helpful?',
      'Iki gisubizo cyaragufashije?',
      'هل كانت هذه الإجابة مفيدة؟',
    ),
    ratingThanks: tri(
      'Thank you for your feedback.',
      'Urakoze ku bitekerezo byawe.',
      'شكراً لملاحظاتك.',
    ),
    relatedTitle: tri('Related questions', 'Ibibazo bifitanye isano', 'أسئلة ذات صلة'),
    askPrompt: tri('Have a question of your own?', 'Ufite ikibazo cyawe?', 'لديك سؤال خاص بك؟'),
    askCta: tri('Ask a question', 'Baza ikibazo', 'اطرح سؤالاً'),
  },
};
