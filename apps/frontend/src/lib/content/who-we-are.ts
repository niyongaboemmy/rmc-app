/** Who We Are — homepage overview section (single record). */
export interface WhoWeAreContent {
  descriptionEn: string;
  descriptionRw: string;
  descriptionAr: string;
  missionEn: string;
  missionRw: string;
  missionAr: string;
  visionEn: string;
  visionRw: string;
  visionAr: string;
  membersCount: string;
  mosquesCount: string;
  provincesCount: string;
  yearsOfService: string;
  // Section heading & Arabic verse.
  headingEn: string; headingRw: string; headingAr: string;
  headingHighlightEn: string; headingHighlightRw: string; headingHighlightAr: string;
  verseEn: string; verseRw: string; verseAr: string;
  verseRefEn: string; verseRefRw: string; verseRefAr: string;
  // All fields are strings; the index signature lets this type satisfy the
  // generic Record<string, unknown> content APIs (getSiteContent / pickLang).
  [key: string]: string;
}

/** Fallback content used when nothing has been saved yet (also the admin seed). */
export const WHO_WE_ARE_DEFAULT: WhoWeAreContent = {
  descriptionEn:
    "The Rwanda Muslim Community (RMC) is the umbrella organization representing Muslims across all provinces of Rwanda. Founded on the principles of Islamic brotherhood, we coordinate religious, educational, and social services for over 500,000 Muslims nationwide.",
  descriptionRw:
    "Umuryango w'Abasilamu bo mu Rwanda (RMC) ni umuryango ngengamikorere uhuza Abasilamu bose muri leta ya Rwanda. Washingwe ku mico y'ubuvandimwe bw'Ubusilamu, tuhuza serivisi z'amadini, z'uburezi n'imibereho myiza y'Abasilamu basaga 500,000 mu Rwanda.",
  descriptionAr:
    'المجتمع الإسلامي الرواندي (RMC) هو المنظمة المظلة التي تمثل المسلمين في جميع مقاطعات رواندا. تأسست على مبادئ الأخوة الإسلامية، وتنسق الخدمات الدينية والتعليمية والاجتماعية لأكثر من 500,000 مسلم على الصعيد الوطني.',
  missionEn:
    'Unite and serve the Muslim community in Rwanda through digital innovation, promoting Islamic values, education, and social welfare.',
  missionRw:
    "Guhuza no gukorera umuryango w'Abasilamu mu Rwanda binyuze mu buhanga bwa digital, guteza imbere indangagaciro z'Ubusilamu, uburezi n'imibereho myiza.",
  missionAr:
    'توحيد وخدمة المجتمع المسلم في رواندا من خلال الابتكار الرقمي، وتعزيز القيم الإسلامية والتعليم والرعاية الاجتماعية.',
  visionEn:
    'A digitally empowered, unified, and prosperous Muslim community contributing to the development of Rwanda.',
  visionRw:
    "Umuryango w'Abasilamu uhuye, ukoresheje ikoranabuhanga kandi ugira inyungu, utera inkunga iterambere rya Rwanda.",
  visionAr: 'مجتمع مسلم ممكّن رقمياً، موحد ومزدهر، يساهم في تطوير رواندا.',
  membersCount: '12500',
  mosquesCount: '320',
  provincesCount: '5',
  yearsOfService: '25',
  headingEn: 'Rwanda Muslim Community —', headingRw: "Umuryango w'Abasilamu bo mu Rwanda —", headingAr: 'المجتمع الإسلامي الرواندي —',
  headingHighlightEn: 'Serving the Ummah', headingHighlightRw: 'Dukorera Umat', headingHighlightAr: 'في خدمة الأمة',
  verseEn: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا', verseRw: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا', verseAr: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا',
  verseRefEn: '"Hold firmly to the rope of Allah, all together" — Aal-Imran 3:103',
  verseRefRw: '"Mufatane mwese ku mugozi w\'Imana" — Aal-Imran 3:103',
  verseRefAr: 'سورة آل عمران — الآية ١٠٣',
};
