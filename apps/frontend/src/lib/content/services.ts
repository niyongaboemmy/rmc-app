import { Tri } from './client';

/**
 * Services landing + per-service MODAL copy, admin-editable in place.
 *
 * Holds the editorial text shown on the /services list and in each ServiceModal:
 * the row title/desc, and the modal summary, requirements, steps and notes. The
 * catalog (which services exist, their icons, accents and links) stays code in
 * lib/services/serviceCatalog.tsx; this owns the words, keyed by the same service
 * key. Requirements and steps are ARRAYS so items can be added/removed inline —
 * the edit store merges arrays by the SAVED length, so a removal sticks (a keyed
 * object would have the default re-injected on load). See EditModeContext.
 *
 * SERVICES_DEFAULT is generated verbatim from services.* in messages/{en,rw,ar}.json,
 * so switching the page from t() to this store is a no-op for every visitor until
 * an admin edits something. Regenerate if the source strings change materially.
 */
export interface ServiceModalCopy {
  summary: Tri;
  req: Tri[];
  step: Tri[];
  notes?: Tri;
}
export interface ServiceCopy {
  title: Tri;
  desc: Tri;
  modal?: ServiceModalCopy;
}
export type ServicesContent = Record<string, ServiceCopy>;

export const SERVICES_DEFAULT: ServicesContent = {
  "marriage": {
    "title": {
      "en": "Marriage Services",
      "rw": "Serivisi y'Ubukwe",
      "ar": "خدمات الزواج"
    },
    "desc": {
      "en": "Official Islamic marriage ceremonies, certificates, and documentation for couples in the community.",
      "rw": "Ibirori by'ubukwe bw'Islamimu, impapuro, n'inyandiko kuri abakobwa n'abasore mu muryango.",
      "ar": "مراسم الزواج الإسلامية الرسمية والشهادات والوثائق للأزواج في المجتمع."
    },
    "modal": {
      "summary": {
        "en": "From pre-marital guidance to an officiated Nikah and your official marriage certificate — handled end to end.",
        "rw": "Kuva ku nama zibanziriza ubukwe kugeza kuri Nikah n'icyemezo cy'ubukwe cyemewe — byose bikorwa neza.",
        "ar": "من الإرشاد قبل الزواج إلى عقد النكاح وإصدار شهادة زواجك الرسمية — نتكفّل بكل خطوة."
      },
      "req": [
        {
          "en": "National ID or passport for both partners",
          "rw": "Irangamuntu cyangwa pasiporo ku bashyingiranwa bombi",
          "ar": "بطاقة هوية وطنية أو جواز سفر لكلا الطرفين"
        },
        {
          "en": "Wali (guardian) consent and ID",
          "rw": "Uruhushya rwa wali (umurinzi) n'irangamuntu",
          "ar": "موافقة الولي وإثبات هويته"
        },
        {
          "en": "Two adult Muslim witnesses",
          "rw": "Abatangabuhamya babiri b'Abayisilamu bakuru",
          "ar": "شاهدان مسلمان بالغان"
        },
        {
          "en": "RMC membership for both partners",
          "rw": "Ubunyamuryango bwa RMC ku bashyingiranwa bombi",
          "ar": "العضوية في RMC لكلا الطرفين"
        },
        {
          "en": "Agreed mahr (dowry) details",
          "rw": "Amakuru ya mahr (inkwano) yumvikanyweho",
          "ar": "تفاصيل المهر المتفق عليه"
        },
        {
          "en": "Passport-size photographs",
          "rw": "Amafoto angana na pasiporo",
          "ar": "صور بحجم جواز السفر"
        }
      ],
      "step": [
        {
          "en": "Enter the couple's details as on their National IDs",
          "rw": "Andika amakuru y'abashyingiranwa nk'uko agaragara ku ndangamuntu",
          "ar": "أدخل بيانات الزوجين كما في بطاقتي الهوية"
        },
        {
          "en": "Choose the ceremony date and venue",
          "rw": "Hitamo aho n'igihe by'ibirori bya Nikah",
          "ar": "اختر مكان وموعد عقد النكاح"
        },
        {
          "en": "Add two Muslim witnesses and the bride's Wali",
          "rw": "Ongeraho abatangabuhamya babiri n'wali w'umugeni",
          "ar": "أضف شاهدين مسلمين وولي العروس"
        },
        {
          "en": "Set the agreed mahr and preferred imam",
          "rw": "Shyiraho mahr mwumvikanyeho na imamu wifuza",
          "ar": "حدّد المهر المتفق عليه والإمام المفضل"
        },
        {
          "en": "Upload the required documents",
          "rw": "Ohereza inyandiko zisabwa",
          "ar": "ارفع الوثائق المطلوبة"
        },
        {
          "en": "Pick a fee tier, pay, and submit",
          "rw": "Hitamo igiciro, wishyure, wohereze",
          "ar": "اختر فئة الرسوم وادفع ثم أرسِل"
        },
        {
          "en": "RMC reviews, the Nikah is performed, and your certificate is issued",
          "rw": "RMC irasuzuma, Nikah igakorwa, icyemezo kikagutangwa",
          "ar": "تراجع RMC الطلب، ثم تُقام المراسم وتصدر شهادتك"
        }
      ],
      "notes": {
        "en": "Both partners must be RMC members. Your application saves as a draft, so you can finish it later.",
        "rw": "Abashyingiranwa bombi bagomba kuba abanyamuryango ba RMC. Ubusabe bubikwa nk'agateganyo, ushobora kuburangiza nyuma.",
        "ar": "يجب أن يكون كلا الطرفين عضوين في RMC. يُحفظ طلبك كمسودة لتكمله لاحقًا."
      }
    }
  },
  "funeral": {
    "title": {
      "en": "Funeral Services",
      "rw": "Serivisi y'Umuryango w'Abapfuye",
      "ar": "خدمات الجنازة"
    },
    "desc": {
      "en": "Coordination of Islamic burial rites, imam assignment, and logistics support for families.",
      "rw": "Gutegura gushyingura mu Islamimu, guha Imam, no gufasha imiryango.",
      "ar": "تنسيق مراسم الدفن الإسلامية وتعيين الإمام ودعم اللوجستيات للعائلات."
    },
    "modal": {
      "summary": {
        "en": "From reporting a death to burial, RMC walks with families at every step — with dignity and care.",
        "rw": "Kuva ku kumenyekanisha urupfu kugeza ku ishyingura, RMC iri kumwe namwe muri buri ntambwe, mu cyubahiro.",
        "ar": "من الإبلاغ عن الوفاة إلى الدفن، يرافق المركز العائلات في كل خطوة بكرامة ورعاية."
      },
      "req": [
        {
          "en": "Deceased's full name, gender, dates of birth and death",
          "rw": "Amazina yombi, igitsina, itariki y’amavuko n’iy’urupfu by’uwitabye Imana",
          "ar": "الاسم الكامل للمتوفى وجنسه وتاريخا الميلاد والوفاة"
        },
        {
          "en": "National ID and death certificate, if available",
          "rw": "Indangamuntu n’icyemezo cy’urupfu, niba bihari",
          "ar": "رقم الهوية وشهادة الوفاة، إن وُجدت"
        },
        {
          "en": "Place of death (city or facility)",
          "rw": "Aho uwitabye Imana yapfiriye (umujyi cyangwa ikigo)",
          "ar": "مكان الوفاة (المدينة أو المرفق)"
        },
        {
          "en": "Next-of-kin name and phone number",
          "rw": "Amazina na nimero ya telefone y’umuvandimwe wa hafi",
          "ar": "اسم أقرب الأقارب ورقم هاتفه"
        },
        {
          "en": "Preferred mosque and cemetery",
          "rw": "Umusigiti n’irimbi wahisemo",
          "ar": "المسجد والمقبرة المفضلان"
        },
        {
          "en": "Preferred burial date and any transport needs",
          "rw": "Itariki yo gushyingura n’uko gutwara umurambo bikenewe",
          "ar": "تاريخ الدفن المفضل واحتياجات النقل"
        }
      ],
      "step": [
        {
          "en": "Report the death to RMC to begin arrangements",
          "rw": "Menyekanisha urupfu kuri RMC utangire gutunganya",
          "ar": "أبلغ المركز عن الوفاة لبدء الترتيبات"
        },
        {
          "en": "Details are verified and the family is contacted",
          "rw": "Amakuru aragenzurwa umuryango ukamenyeshwa",
          "ar": "التحقق من البيانات والاتصال بالأسرة"
        },
        {
          "en": "Ghusl is performed and the kafan prepared",
          "rw": "Ghusl ikorwa na kafan igategurwa",
          "ar": "أداء الغُسل وتجهيز الكفن"
        },
        {
          "en": "Janāzah prayer is scheduled",
          "rw": "Isengesho rya Janaza riteganywa",
          "ar": "تحديد موعد صلاة الجنازة"
        },
        {
          "en": "The deceased is transported to the cemetery",
          "rw": "Umurambo utwarwa ujyanwa mu irimbi",
          "ar": "نقل المتوفى إلى المقبرة"
        },
        {
          "en": "Burial is completed with dignity",
          "rw": "Ishyingura rirarangira mu cyubahiro",
          "ar": "إتمام الدفن بكرامة"
        }
      ],
      "notes": {
        "en": "RMC is here at any hour and assists families in need with counselling, food and financial aid.",
        "rw": "RMC iboneka igihe icyo ari cyo cyose kandi ifasha imiryango ikennye: ubujyanama, ibiribwa n’amafaranga.",
        "ar": "المركز متاح في أي وقت ويساعد الأسر المحتاجة بالإرشاد والطعام والمساعدة المالية."
      }
    }
  },
  "conduct": {
    "title": {
      "en": "Good Conduct Certificate",
      "rw": "Icyemezo cy'Imyitwarire Myiza",
      "ar": "شهادة حسن السيرة"
    },
    "desc": {
      "en": "Official certificates of good Islamic conduct for members — required for various administrative processes.",
      "rw": "Impapuro zigenwa neza z'imyitwarire myiza kuri abanyamuryango - bizagenerwa inzego zinyuranye.",
      "ar": "شهادات رسمية لحسن السيرة الإسلامية للأعضاء — مطلوبة لعمليات إدارية مختلفة."
    },
    "modal": {
      "summary": {
        "en": "Official certificate of good Islamic conduct for members, required for various administrative processes.",
        "rw": "Icyemezo cy'imyitwarire myiza ku banyamuryango, kigenerwa inzego zinyuranye.",
        "ar": "شهادة رسمية لحسن السيرة الإسلامية للأعضاء، مطلوبة لعمليات إدارية مختلفة."
      },
      "req": [
        {
          "en": "An RMC account (sign in to apply)",
          "rw": "Konti ya RMC (winjire kugira usabe)",
          "ar": "حساب في RMC (سجّل الدخول للتقديم)"
        },
        {
          "en": "Your full names, plus father's and mother's names",
          "rw": "Amazina yawe yombi, aya So n'aya Nyoko",
          "ar": "اسمك الكامل واسم الأب واسم الأم"
        },
        {
          "en": "Residence: district, sector, cell, village",
          "rw": "Aho utuye: akarere, umurenge, akagari, umudugudu",
          "ar": "مكان الإقامة: المقاطعة، القطاع، الخلية، القرية"
        },
        {
          "en": "Email and a valid Rwanda phone number (07XXXXXXXX)",
          "rw": "Imeyili na nimero ya telefoni (07XXXXXXXX)",
          "ar": "البريد الإلكتروني ورقم هاتف رواندي (07XXXXXXXX)"
        },
        {
          "en": "Your mosque (Imam's name auto-filled)",
          "rw": "Umusigiti wawe (amazina y'Imamu yuzuzwa yikoresha)",
          "ar": "مسجدك (يُملأ اسم الإمام تلقائيًا)"
        },
        {
          "en": "Reason: employment, visa, school, or other",
          "rw": "Impamvu: akazi, viza, kwiga, cyangwa ikindi",
          "ar": "السبب: التوظيف، تأشيرة، دراسة، أو أخرى"
        }
      ],
      "step": [
        {
          "en": "Sign in and open the request form",
          "rw": "Injira ufungure ifishi y'icyifuzo",
          "ar": "سجّل الدخول وافتح نموذج الطلب"
        },
        {
          "en": "Enter your identity and contact details",
          "rw": "Uzuza amakuru y'umwirondoro n'aho twagusanga",
          "ar": "أدخل بيانات الهوية والاتصال"
        },
        {
          "en": "Select your mosque and reason for the request",
          "rw": "Hitamo umusigiti n'impamvu y'icyifuzo",
          "ar": "اختر المسجد وسبب الطلب"
        },
        {
          "en": "Pay the fee by Mobile Money or bank transfer",
          "rw": "Ishyura amafaranga: Mobile Money cyangwa banki",
          "ar": "ادفع الرسوم عبر موبايل موني أو تحويل بنكي"
        },
        {
          "en": "A reviewer verifies your details and approves it",
          "rw": "Umugenzuzi agenzura amakuru yawe akayemeza",
          "ar": "يتحقق المراجع من بياناتك ويوافق عليها"
        },
        {
          "en": "Download your issued Good Conduct certificate",
          "rw": "Kuramo icyemezo cyawe cy'Imyitwarire cyatanzwe",
          "ar": "نزّل شهادة حسن السلوك بعد إصدارها"
        }
      ],
      "notes": {
        "en": "Pay the fee by Mobile Money or bank transfer.",
        "rw": "Ishyura amafaranga ukoresheje Mobile Money cyangwa banki.",
        "ar": "ادفع الرسوم عبر موبايل موني أو التحويل البنكي."
      }
    }
  },
  "scholarship": {
    "title": {
      "en": "Scholarships",
      "rw": "Buruse",
      "ar": "المنح الدراسية"
    },
    "desc": {
      "en": "Financial support for Muslim students pursuing education at all levels.",
      "rw": "Inkunga y'amafaranga kuri abanyeshuri b'Abasilamu bavoma uburezi mu mashuri yose.",
      "ar": "دعم مالي للطلاب المسلمين الساعين إلى التعليم على جميع المستويات."
    },
    "modal": {
      "summary": {
        "en": "Financial support for Muslim students pursuing education at all levels.",
        "rw": "Inkunga y'amafaranga kuri abanyeshuri b'Abasilamu bavoma uburezi mu mashuri yose.",
        "ar": "دعم مالي للطلاب المسلمين الساعين إلى التعليم على جميع المستويات."
      },
      "req": [
        {
          "en": "Your full name, date of birth, and phone number",
          "rw": "Amazina yombi, itariki y'amavuko, na nimero ya telefoni",
          "ar": "الاسم الكامل وتاريخ الميلاد ورقم الهاتف"
        },
        {
          "en": "Your district and sector",
          "rw": "Akarere n'umurenge ubamo",
          "ar": "المقاطعة والقطاع اللذان تقيم فيهما"
        },
        {
          "en": "Current school, education level, and grade or year",
          "rw": "Ishuri urimo, urwego rw'uburezi, n'umwaka cyangwa icyiciro",
          "ar": "مدرستك الحالية ومستواك التعليمي وسنتك أو صفك"
        },
        {
          "en": "A guardian's name, phone number, and relationship to you",
          "rw": "Amazina, nimero ya telefoni, n'isano y'umurera wawe",
          "ar": "اسم ولي الأمر ورقم هاتفه وصلة قرابته بك"
        },
        {
          "en": "A short statement on why you need the scholarship",
          "rw": "Sobanura mu magambo make impamvu ukeneye iyi buruse",
          "ar": "شرح مختصر لسبب حاجتك إلى هذه المنحة"
        }
      ],
      "step": [
        {
          "en": "Sign in to your RMC account, or create one",
          "rw": "Injira kuri konti yawe ya RMC, cyangwa ufungure imwe",
          "ar": "سجّل الدخول إلى حسابك في RMC أو أنشئ حسابًا"
        },
        {
          "en": "Fill the short 3-step form: personal, education, and guardian details",
          "rw": "Uzuza ifishi ngufi y'intambwe eshatu: amakuru bwite, uburezi, n'umurera",
          "ar": "املأ النموذج القصير من 3 خطوات: بيانات شخصية وتعليمية وولي الأمر"
        },
        {
          "en": "Submit and get your application tracking number",
          "rw": "Ohereza wakire nomero yo gukurikirana ubusabe",
          "ar": "أرسل طلبك واحصل على رقم تتبع خاص به"
        },
        {
          "en": "Use your tracking number to check your status anytime",
          "rw": "Koresha nomero yo gukurikirana urebe aho bugeze igihe cyose",
          "ar": "استخدم رقم التتبع لمعرفة حالة طلبك في أي وقت"
        }
      ],
      "notes": {
        "en": "Applying is free. Reviews take 5–10 business days.",
        "rw": "Gusaba ni ubuntu. Isuzuma rimara iminsi 5–10 y'akazi.",
        "ar": "التقديم مجاني. تستغرق المراجعة من 5 إلى 10 أيام عمل."
      }
    }
  },
  "tender": {
    "title": {
      "en": "Tenders",
      "rw": "Itumba",
      "ar": "المناقصات"
    },
    "desc": {
      "en": "Business opportunities published by RMC for qualified organizations and contractors.",
      "rw": "Amahirwe y'ubucuruzi ashyirwa ahagaragara na RMC ku mashirika n'abakozi bafite ubushobozi.",
      "ar": "الفرص التجارية التي تنشرها المجتمع الإسلامي الرواندي للمنظمات والمقاولين المؤهلين."
    },
    "modal": {
      "summary": {
        "en": "Submit a bid against an open RMC tender and track it from evaluation to award.",
        "rw": "Tanga ipiganwa ku itumba rikinguye rya RMC, urikurikirane kuva ku isuzuma kugeza ku mwanzuro.",
        "ar": "قدّم عرضًا لمناقصة مفتوحة من المجتمع الإسلامي الرواندي وتابعه من التقييم حتى الترسية."
      },
      "req": [
        {
          "en": "Company Registration (RDB) certificate from the Rwanda Development Board",
          "rw": "Icyemezo cy'iyandikwa ry'ikigo (RDB) gitangwa na Rwanda Development Board",
          "ar": "شهادة تسجيل الشركة (RDB) الصادرة عن مجلس تنمية رواندا"
        },
        {
          "en": "Valid RRA Tax Clearance certificate from the Rwanda Revenue Authority",
          "rw": "Icyemezo cyemewe cy'imisoro (RRA) gitangwa na Rwanda Revenue Authority",
          "ar": "شهادة مخالصة ضريبية سارية (RRA) صادرة عن هيئة الإيرادات الرواندية"
        },
        {
          "en": "Technical & Financial Proposal, including your pricing",
          "rw": "Igitekerezo cya tekiniki n'imari, hamwe n'ibiciro",
          "ar": "العرض الفني والمالي متضمنًا التسعير"
        },
        {
          "en": "Registered company name, 9-digit TIN, and a contact person",
          "rw": "Izina ry'ikigo cyanditse, nomero ya TIN y'imibare 9, n'umuhuza",
          "ar": "اسم الشركة المسجل، ورقم ضريبي من 9 أرقام، ومسؤول تواصل"
        },
        {
          "en": "Submit before the tender deadline; bids can't be edited after it passes",
          "rw": "Tanga ipiganwa mbere y'igihe ntarengwa; ntirihindurwa cyararenze",
          "ar": "قدّم عرضك قبل الموعد النهائي؛ لا يمكن تعديله بعد انتهائه"
        }
      ],
      "step": [
        {
          "en": "Browse open tenders and read the terms and deadline",
          "rw": "Reba amatumba akinguye usome amabwiriza n'igihe ntarengwa",
          "ar": "تصفح المناقصات المفتوحة واقرأ شروطها وموعدها النهائي"
        },
        {
          "en": "Complete the form: company details, contact, address, bid amount",
          "rw": "Uzuza ifishi: amakuru y'ikigo, umuhuza, aderesi, igiciro",
          "ar": "أكمل النموذج: بيانات الشركة، ومسؤول التواصل، والعنوان، والقيمة"
        },
        {
          "en": "Upload the three required documents (PDF, JPG or PNG, up to 10 MB)",
          "rw": "Ohereza inyandiko eshatu zisabwa (PDF, JPG cyangwa PNG, ntizirenge 10 MB)",
          "ar": "ارفع الوثائق الثلاث المطلوبة (PDF أو JPG أو PNG، حتى 10 ميغابايت)"
        },
        {
          "en": "Get a reference number and track your bid to the outcome",
          "rw": "Uzahabwa nomero, ukurikirane ipiganwa kugeza ku mwanzuro",
          "ar": "احصل على رقم مرجعي وتابع عرضك حتى النتيجة"
        }
      ],
      "notes": {
        "en": "You need an RMC account to submit and track a bid.",
        "rw": "Ukeneye konti ya RMC kugira ngo utange unakurikirane ipiganwa.",
        "ar": "تحتاج إلى حساب لدى المجتمع الإسلامي الرواندي لتقديم عرض وتتبعه."
      }
    }
  },
  "jobs": {
    "title": {
      "en": "Job Opportunities",
      "rw": "Amahirwe y'Akazi",
      "ar": "فرص العمل"
    },
    "desc": {
      "en": "Employment vacancies at RMC and affiliated organizations across Rwanda.",
      "rw": "Imirimo ihagaze muri RMC n'imiryango ishamikiyeho muri Rwanda.",
      "ar": "الوظائف الشاغرة في المجتمع الإسلامي الرواندي والمنظمات التابعة لها في جميع أنحاء رواندا."
    },
    "modal": {
      "summary": {
        "en": "Apply for open positions at RMC and affiliated organizations, and track your application status.",
        "rw": "Saba imyanya ifunguye muri RMC n'imiryango ishamikiyeho, ukurikirane aho isaba ryawe rigeze.",
        "ar": "تقدّم للوظائف الشاغرة في المجتمع الإسلامي الرواندي والمنظمات التابعة له، وتابع حالة طلبك."
      },
      "req": [
        {
          "en": "Application letter",
          "rw": "Ibaruwa isaba",
          "ar": "خطاب التقديم"
        },
        {
          "en": "Curriculum Vitae (CV)",
          "rw": "CV",
          "ar": "السيرة الذاتية"
        },
        {
          "en": "National ID",
          "rw": "Indangamuntu",
          "ar": "الهوية الوطنية"
        },
        {
          "en": "Criminal record certificate",
          "rw": "Icyemezo cy'imyifatire",
          "ar": "شهادة السجل الجنائي"
        },
        {
          "en": "Academic papers (diplomas / certificates)",
          "rw": "Impamyabumenyi (dipolome / impamyabumenyi)",
          "ar": "الشهادات الأكاديمية (دبلومات / شهادات)"
        },
        {
          "en": "Good conduct certificate — a number to verify, or a file to upload",
          "rw": "Icyemezo cy'imyifatire myiza — nimero yo kugenzura, cyangwa dosiye yo kohereza",
          "ar": "شهادة حسن السيرة — رقم للتحقق، أو ملف للرفع"
        }
      ],
      "step": [
        {
          "en": "Sign in to your RMC account, or register if you're new",
          "rw": "Injira kuri konti yawe ya RMC, cyangwa wiyandikishe niba uri mushya",
          "ar": "سجّل الدخول إلى حسابك في RMC، أو أنشئ حسابًا إن كنت جديدًا"
        },
        {
          "en": "Enter your personal details and the position you're applying for",
          "rw": "Andika amakuru yawe bwite n'umwanya usaba",
          "ar": "أدخل بياناتك الشخصية والوظيفة التي تتقدم لها"
        },
        {
          "en": "Upload your letter, CV, National ID, criminal record and academic papers",
          "rw": "Ohereza ibaruwa isaba, CV, Indangamuntu, icyemezo cy'imyifatire n'impamyabumenyi",
          "ar": "ارفع خطاب التقديم والسيرة الذاتية والهوية والسجل الجنائي والشهادات"
        },
        {
          "en": "Verify your good-conduct certificate number, or upload the certificate",
          "rw": "Genzura nimero y'icyemezo cy'imyifatire, cyangwa uohereze icyemezo",
          "ar": "تحقّق من رقم شهادة حسن السيرة، أو ارفع الشهادة"
        },
        {
          "en": "Submit and keep your tracking number to follow your status",
          "rw": "Ohereza ubike nimero yo gukurikirana kugira ngo urebe aho isaba rigeze",
          "ar": "أرسل واحتفظ برقم التتبع لمتابعة حالة طلبك"
        }
      ],
      "notes": {
        "en": "Sign-in required. You can upload PDF, Word or images; employer recommendation is optional.",
        "rw": "Kwinjira birasabwa. Ushobora kohereza PDF, Word cyangwa amafoto; icyemezo cy'umukoresha si itegeko.",
        "ar": "تسجيل الدخول مطلوب. يمكنك رفع PDF أو Word أو صور؛ توصية جهة العمل اختيارية."
      }
    }
  },
  "hajj": {
    "title": {
      "en": "Hajj Services",
      "rw": "Serivisi za Hija",
      "ar": "خدمات الحج"
    },
    "desc": {
      "en": "Guidance, registration, and support for pilgrims — from preparation to departure.",
      "rw": "Ubuyobozi, kwiyandikisha, no gufasha abagenzi — kuva mu myiteguro kugeza ku kugenda.",
      "ar": "إرشاد وتسجيل ودعم للحجاج — من الإعداد حتى المغادرة."
    },
    "modal": {
      "summary": {
        "en": "Guidance, registration and support for pilgrims — from preparation to departure, with online status tracking.",
        "rw": "Ubuyobozi, kwiyandikisha, no gufasha abagenzi — kuva mu myiteguro kugeza ku kugenda, ukurikirana aho ubusabe bugeze.",
        "ar": "إرشاد وتسجيل ودعم للحجاج — من الإعداد حتى المغادرة، مع متابعة حالة الطلب عبر الإنترنت."
      },
      "req": [
        {
          "en": "Passport valid at least 6 months beyond travel",
          "rw": "Pasiporo ifite nibura amezi 6 nyuma y’urugendo",
          "ar": "جواز سفر ساري لمدة 6 أشهر على الأقل بعد السفر"
        },
        {
          "en": "Registration fee — 40,000 RWF, non-refundable",
          "rw": "Amafaranga yo kwiyandikisha — 40,000 RWF, adasubizwa",
          "ar": "رسوم التسجيل — 40,000 فرنك، غير مستردة"
        },
        {
          "en": "Initial payment — 400,000 RWF to reserve your place",
          "rw": "Ubwishyu bwa mbere — 400,000 RWF bwo kubika umwanya",
          "ar": "الدفعة الأولية — 400,000 فرنك لحجز مكانك"
        },
        {
          "en": "Financial capacity to cover the remaining cost",
          "rw": "Ubushobozi bwo kwishyura igice gisigaye cy’urugendo",
          "ar": "القدرة المالية لتغطية التكلفة المتبقية"
        },
        {
          "en": "Scanned documents ready before you register",
          "rw": "Inyandiko zafotowe ziteguye mbere yo kwiyandikisha",
          "ar": "وثائق ممسوحة جاهزة قبل التسجيل"
        },
        {
          "en": "Proof of payment to upload with your application",
          "rw": "Icyemezo cy’ubwishyu cyo kohereza mu busabe bwawe",
          "ar": "إثبات الدفع لرفعه مع طلبك"
        }
      ],
      "step": [
        {
          "en": "Register online with your personal and passport details",
          "rw": "Iyandikishe kuri interineti utanga amakuru yawe na pasiporo",
          "ar": "سجّل عبر الإنترنت ببياناتك الشخصية ومعلومات جواز السفر"
        },
        {
          "en": "Pay the fees to an official bank account and upload proofs",
          "rw": "Ishyura amafaranga kuri konti ya banki, wohereze ibimenyetso",
          "ar": "ادفع الرسوم إلى حساب مصرفي رسمي وارفع إثباتات الدفع"
        },
        {
          "en": "The committee reviews your documents and payments",
          "rw": "Komite isuzuma inyandiko n’ibimenyetso by’ubwishyu bwawe",
          "ar": "تراجع اللجنة وثائقك وإثباتات الدفع"
        },
        {
          "en": "Once approved, we process your Hajj visa and travel documents",
          "rw": "Wemerwa, dutunganya viza ya Hija n’inyandiko z’urugendo",
          "ar": "بعد الموافقة، نصدر تأشيرة الحج ووثائق السفر"
        },
        {
          "en": "Travel with the group and perform Hajj, guided throughout",
          "rw": "Genda n’itsinda ukore Hija, uyobowe mu rugendo rwose",
          "ar": "سافر مع المجموعة وأدِّ الحج بإرشاد طوال الرحلة"
        }
      ],
      "notes": {
        "en": "Pay the Hajj fees into an official bank account, then upload your receipt when you register.",
        "rw": "Ishyura amafaranga ya Hija kuri konti ya banki yemewe, wohereze inyemezabwishyu wiyandikisha.",
        "ar": "ادفع رسوم الحج في حساب مصرفي رسمي، ثم ارفع الإيصال عند التسجيل."
      }
    }
  }
};
