import { Tri, tri } from './client';

/**
 * The Good Conduct service landing page (/services/good-conduct).
 *
 * The page was the thinnest service landing in the app — a hero and two links — and the
 * only one that said nothing about what applying involves. An applicant found out what
 * was required by starting the form and meeting the fields one at a time. This section
 * exists so the requirements can be read before that.
 *
 * Seeded VERBATIM from `services.conduct.*` in messages/{en,rw,ar}.json, so moving the
 * page onto this store changes nothing for a visitor until an admin edits something.
 * The `apply` / `status` card copy keeps the strings the page already showed.
 *
 * ── Requirements and steps are lists, and lists here are UNMERGED ───────────────────
 *
 * Same rule as the tender/jobs/scholarship boards (`service-boards.ts`): `mergeContent`
 * merges arrays BY INDEX, so an admin deleting the second of four requirements would
 * leave the third shifted up wearing the second's seeded translations. `unmergedList`
 * takes the saved array whole, or the seeded one when nothing has been saved.
 */

/** One `{ title, text }` entry — requirements and steps share the shape. */
export interface GoodConductItem {
  /** Stable id, so React keys survive reordering. Any unique string. */
  id?: string;
  title: Tri;
  text: Tri;
}

export interface GoodConductContent {
  hero: { title: Tri; lede: Tri };
  /** The "what this certificate is" prose the page never had. */
  about: { eyebrow: Tri; title: Tri; body: Tri };
  /** What an applicant must have ready BEFORE opening the form. */
  requirements: { title: Tri; lede: Tri; items: GoodConductItem[] };
  /** What happens after applying. */
  steps: { title: Tri; items: GoodConductItem[] };
  /** The two existing cards at the foot of the page. */
  cta: {
    applyTitle: Tri;
    applyText: Tri;
    applyCta: Tri;
    statusTitle: Tri;
    statusText: Tri;
    statusCta: Tri;
  };
}

/** Build a seeded entry; the id keeps React keys stable across reordering. */
function item(id: string, title: Tri, text: Tri): GoodConductItem {
  return { id, title, text };
}

export const GOOD_CONDUCT_DEFAULT: GoodConductContent = {
  hero: {
    // Lifted from services.conduct.title / .desc.
    title: tri(
      'Good Conduct Certificate',
      "Icyemezo cy'Imyitwarire Myiza",
      'شهادة حسن السيرة',
    ),
    lede: tri(
      'Official certificates of good Islamic conduct for members — required for various administrative processes.',
      "Impapuro zigenwa neza z'imyitwarire myiza kuri abanyamuryango - bizagenerwa inzego zinyuranye.",
      'شهادات رسمية لحسن السيرة الإسلامية للأعضاء — مطلوبة لعمليات إدارية مختلفة.',
    ),
  },

  about: {
    eyebrow: tri('About the certificate', 'Ibyerekeye icyemezo', 'عن الشهادة'),
    title: tri(
      'What this certificate confirms',
      'Icyo iki cyemezo kigaragaza',
      'ما تؤكده هذه الشهادة',
    ),
    body: tri(
      'A good conduct certificate is RMC’s written confirmation that you are known to your mosque as a member of good standing. It is issued after your imam has confirmed your conduct, and is commonly asked for by employers, embassies and schools.',
      "Icyemezo cy'imyitwarire myiza ni ubuhamya bwanditse bwa RMC ko uzwi mu musigiti wawe nk'umunyamuryango ufite imyitwarire myiza. Gitangwa nyuma y'uko imamu yemeje imyitwarire yawe, kandi gisabwa kenshi n'abakoresha, ambasade n'amashuri.",
      'شهادة حسن السيرة هي تأكيد خطي من المجلس بأنك معروف في مسجدك كعضو حسن السيرة. تُصدر بعد أن يؤكد إمامك سلوكك، وكثيراً ما يطلبها أصحاب العمل والسفارات والمدارس.',
    ),
  },

  requirements: {
    title: tri('Before you apply', 'Mbere yo gusaba', 'قبل أن تتقدم'),
    lede: tri(
      'Have these ready — the form asks for them in order.',
      'Menya ibi mbere — ifishi ibibaza uko bikurikirana.',
      'جهّز هذه المعلومات — يطلبها النموذج بالترتيب.',
    ),
    // Seeded from what GoodConductWizard actually collects, so the page and the form
    // cannot disagree about what is needed.
    items: [
      item(
        'gc-req-0',
        tri('Your full names', 'Amazina yawe yombi', 'اسمك الكامل'),
        tri(
          'As they appear on your national ID. Your father’s and mother’s names are asked for as well, though they are optional.',
          "Nk'uko ari ku ndangamuntu yawe. Amazina ya so na nyoko na yo arasabwa, ariko si itegeko.",
          'كما تظهر في بطاقة هويتك. يُطلب أيضاً اسم والدك ووالدتك، وإن كانا اختياريين.',
        ),
      ),
      item(
        'gc-req-1',
        tri('A phone number we can reach you on', 'Nimero ya telefone twagushakaho', 'رقم هاتف يمكننا الوصول إليك عليه'),
        tri(
          'Used to send you the result and to verify the request. An email address is optional.',
          "Ikoreshwa mu kukoherereza igisubizo no kwemeza icyifuzo. Imeyili ni uko ushaka.",
          'يُستخدم لإرسال النتيجة والتحقق من الطلب. البريد الإلكتروني اختياري.',
        ),
      ),
      item(
        'gc-req-2',
        tri('Where you live', 'Aho utuye', 'مكان إقامتك'),
        tri(
          'District and sector, and your cell and village if you know them.',
          "Akarere n'umurenge, hamwe n'akagari n'umudugudu niba ubizi.",
          'المقاطعة والقطاع، والخلية والقرية إن كنت تعرفهما.',
        ),
      ),
      item(
        'gc-req-3',
        tri('Your mosque or imam', 'Umusigiti wawe cyangwa imamu', 'مسجدك أو إمامك'),
        tri(
          'Choose the mosque you attend, or name the imam who knows you. Your conduct is confirmed by them before the certificate is issued.',
          "Hitamo umusigiti usengeramo, cyangwa utange izina ry'imamu ugukunda. Ni we wemeza imyitwarire yawe mbere y'uko icyemezo gitangwa.",
          'اختر المسجد الذي ترتاده، أو اذكر الإمام الذي يعرفك. هو من يؤكد سلوكك قبل إصدار الشهادة.',
        ),
      ),
      item(
        'gc-req-4',
        tri('Why you need it', 'Impamvu uyikeneye', 'سبب حاجتك إليها'),
        tri(
          'Employment, a visa, school, or another reason you can describe briefly.',
          "Akazi, viza, ishuri, cyangwa indi mpamvu ushobora gusobanura mu magambo make.",
          'عمل، أو تأشيرة، أو دراسة، أو سبب آخر يمكنك وصفه بإيجاز.',
        ),
      ),
    ],
  },

  steps: {
    title: tri('How it works', 'Uko bigenda', 'كيف تسير العملية'),
    items: [
      item(
        'gc-step-0',
        tri('You submit the request', 'Wohereza icyifuzo', 'ترسل الطلب'),
        tri(
          'Fill the form with the details above. You receive a tracking code straight away.',
          "Uzuza ifishi ukoresheje amakuru avuzwe haruguru. Uhita ubona kode yo gukurikirana.",
          'املأ النموذج بالبيانات أعلاه. ستحصل على رمز تتبع على الفور.',
        ),
      ),
      item(
        'gc-step-1',
        tri('Your imam confirms your conduct', 'Imamu yemeza imyitwarire yawe', 'يؤكد إمامك سلوكك'),
        tri(
          'RMC contacts the mosque you named. This is the step that takes the longest.',
          "RMC ivugana n'umusigiti watanze. Iyi ni intambwe itwara igihe kinini.",
          'يتواصل المجلس مع المسجد الذي ذكرته. هذه هي الخطوة الأطول.',
        ),
      ),
      item(
        'gc-step-2',
        tri('The certificate is issued', 'Icyemezo giratangwa', 'تُصدر الشهادة'),
        tri(
          'You are notified, and can download it from the status page. Anyone can verify it from its number.',
          "Uramenyeshwa, ukagikuramo ku ipaji y'aho bigeze. Umuntu wese ashobora kugigenzura akoresheje nimero yacyo.",
          'يتم إعلامك، ويمكنك تنزيلها من صفحة الحالة. ويمكن لأي شخص التحقق منها برقمها.',
        ),
      ),
    ],
  },

  cta: {
    // The four strings the page already showed, unchanged.
    applyTitle: tri('Request a Certificate', 'Saba Icyemezo', 'اطلب شهادة'),
    applyText: tri(
      'Submit your details, masjid, and reason for the request.',
      "Ohereza amakuru yawe, umusigiti, n'impamvu y'icyifuzo cyawe.",
      'أرسل بياناتك ومسجدك وسبب طلبك.',
    ),
    applyCta: tri('Apply Now', 'Saba Nonaha', 'تقدم بطلب الآن'),
    statusTitle: tri('Track My Request', 'Kurikirana Icyifuzo Cyanjye', 'تتبع طلبي'),
    statusText: tri(
      "Check the status of a request you've already submitted.",
      'Reba aho icyifuzo wohereje kigeze.',
      'تحقق من حالة طلب سبق أن أرسلته.',
    ),
    statusCta: tri('Check Status', 'Reba Aho Bigeze', 'تحقق من الحالة'),
  },
};

/**
 * The requirements an admin has saved, or the seeded ones when nothing has been.
 *
 * Unmerged for the reason given at the top of this file: `mergeContent` merges arrays by
 * index, so a deleted entry would leave its neighbour wearing its translations.
 */
export function goodConductRequirements(saved: unknown): GoodConductItem[] {
  return unmerged(
    (saved as GoodConductContent | null)?.requirements?.items,
    GOOD_CONDUCT_DEFAULT.requirements.items,
    'gc-req',
  );
}

/** The steps an admin has saved, or the seeded ones. Counterpart of the above. */
export function goodConductSteps(saved: unknown): GoodConductItem[] {
  return unmerged(
    (saved as GoodConductContent | null)?.steps?.items,
    GOOD_CONDUCT_DEFAULT.steps.items,
    'gc-step',
  );
}

function unmerged(items: unknown, fallback: GoodConductItem[], idPrefix: string): GoodConductItem[] {
  if (!Array.isArray(items)) return fallback;
  return items.map((raw, i) => {
    const entry = (raw ?? null) as Record<string, unknown> | null;
    return {
      id: (entry?.id as string) || `${idPrefix}-${i}`,
      title: (entry?.title as Tri) ?? tri(''),
      text: (entry?.text as Tri) ?? tri(''),
    };
  });
}
