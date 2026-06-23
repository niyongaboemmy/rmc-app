'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  BookOpen, MapPin, HandHeart, Sparkles, CheckCircle2,
  Loader2, GraduationCap, Users, Send,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { pick } from '@/lib/content-api';
import { submitContactMessage } from '@/lib/contactApi';

// Leaflet touches `window`, so the map only loads on the client.
const NearestSchoolMap = dynamic(() => import('@/components/home/NearestSchoolMap'), {
  ssr: false,
  loading: () => <div className="h-72 sm:h-80 w-full animate-pulse bg-gray-100" />,
});

interface NextStep {
  icon: typeof BookOpen;
  title: { en: string; rw: string; ar: string };
  description: { en: string; rw: string; ar: string };
}

const NEXT_STEPS: NextStep[] = [
  {
    icon: GraduationCap,
    title: { en: 'Learn to pray (Salah)', rw: 'Wige gusenga (Swala)', ar: 'تعلّم الصلاة' },
    description: {
      en: 'The five daily prayers are the heart of a Muslim\'s day. Learn the wudu (ablution) and the prayer movements step by step.',
      rw: 'Amasengesho atanu ya buri munsi ni umutima w\'umunsi w\'Umuyisilamu. Wige iyuhagira (wudu) n\'uko gusenga bigenda buhoro buhoro.',
      ar: 'الصلوات الخمس هي قلب يوم المسلم. تعلّم الوضوء وحركات الصلاة خطوة بخطوة.',
    },
  },
  {
    icon: BookOpen,
    title: { en: 'Start with the Qur\'an', rw: 'Tangira na Qur\'an', ar: 'ابدأ بالقرآن' },
    description: {
      en: 'Begin learning the short surahs and the meaning of what you recite. A teacher will help you read the Arabic.',
      rw: 'Tangira kwiga surah ngufi n\'icyo zisobanura. Umwarimu azagufasha gusoma icyarabu.',
      ar: 'ابدأ بتعلّم السور القصيرة ومعاني ما تقرأ. سيساعدك المعلّم على قراءة العربية.',
    },
  },
  {
    icon: MapPin,
    title: { en: 'Join your nearest mosque', rw: 'Jya mu musigiti uri hafi', ar: 'انضم إلى أقرب مسجد' },
    description: {
      en: 'Community is a gift. Visit the nearest mosque or Islamic school to pray, ask questions, and find brothers and sisters.',
      rw: 'Umuryango ni impano. Sura umusigiti cyangwa ishuri ry\'Abayisilamu riri hafi usenge, ubaze, ubone abavandimwe.',
      ar: 'الجماعة نعمة. زُر أقرب مسجد أو مدرسة إسلامية للصلاة وطرح الأسئلة ولقاء الإخوة والأخوات.',
    },
  },
  {
    icon: HandHeart,
    title: { en: 'Take it one day at a time', rw: 'Genda buhoro buhoro', ar: 'تقدّم خطوة بخطوة' },
    description: {
      en: 'You do not need to learn everything at once. Allah is Most Merciful — sincerity and small consistent steps are what matter.',
      rw: 'Ntugomba kwiga byose icyarimwe. Allah ni Nyirimbabazi — ubunyangamugayo n\'intambwe nto zihoraho ni byo by\'ingenzi.',
      ar: 'لا حاجة لتتعلّم كل شيء دفعة واحدة. الله أرحم الراحمين — الإخلاص والخطوات الصغيرة الثابتة هي المهمة.',
    },
  },
];

// A couple of essential supplications a new Muslim often wants on hand.
const DUAS = [
  {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    translit: 'Bismillah ir-Rahman ir-Rahim',
    meaning: { en: 'In the name of Allah, the Most Gracious, the Most Merciful.', rw: 'Mu izina rya Allah, Nyirimpuhwe, Nyirimbabazi.', ar: 'بسم الله الرحمن الرحيم.' },
  },
  {
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    translit: 'Rabbi zidni \'ilma',
    meaning: { en: 'My Lord, increase me in knowledge.', rw: 'Nyagasani wanjye, nyongerera ubumenyi.', ar: 'ربِّ زدني علماً.' },
  },
];

export default function NewMuslimPage() {
  const { locale } = useParams<{ locale: string }>();
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <PageHero
        eyebrow={pick({ en: 'Welcome to Islam', rw: 'Murakaza neza muri Islam', ar: 'مرحباً بك في الإسلام' }, locale)}
        title={pick({ en: 'Your Journey Begins Here', rw: 'Urugendo Rwawe Rutangirira Hano', ar: 'رحلتك تبدأ من هنا' }, locale)}
        subtitle={pick(
          {
            en: 'Congratulations and welcome, dear brother or sister. Here is what comes next — and how the Rwanda Muslim Community is here to walk with you.',
            rw: 'Twishimiye kandi turagusuhuje, mwene wacu nkunda. Dore ibikurikira — n\'uko Umuryango w\'Abayisilamu bo mu Rwanda uri kumwe nawe.',
            ar: 'مبروك وأهلاً بك، أخي أو أختي العزيزة. إليك ما يأتي بعد ذلك — وكيف يقف المجتمع الإسلامي الرواندي معك.',
          },
          locale,
        )}
        ornament
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 space-y-16">
        {/* Next steps */}
        <Reveal>
          <section>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className={`inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-rmc-green/10 text-rmc-green text-xs font-semibold ${isAr ? 'font-arabic' : ''}`}>
                <Sparkles className="w-3.5 h-3.5" />
                {pick({ en: 'What\'s Next', rw: 'Ibikurikira', ar: 'الخطوات التالية' }, locale)}
              </div>
              <h2 className={`text-2xl md:text-3xl font-bold text-gray-900 ${isAr ? 'font-arabic' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
                {pick({ en: 'Your first steps as a Muslim', rw: 'Intambwe zawe za mbere nk\'Umuyisilamu', ar: 'خطواتك الأولى كمسلم' }, locale)}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {NEXT_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-6 hover:border-rmc-green/30 hover:shadow-lg transition-all" dir={isAr ? 'rtl' : 'ltr'}>
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-rmc-green-light flex items-center justify-center text-rmc-green">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-bold text-gray-900 text-base mb-1 ${isAr ? 'font-arabic' : ''}`}>{pick(step.title, locale)}</h3>
                      <p className={`text-gray-500 text-sm leading-relaxed ${isAr ? 'font-arabic' : ''}`}>{pick(step.description, locale)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>

        {/* Essential duas */}
        <Reveal>
          <section className="rounded-3xl border border-rmc-gold/25 bg-gradient-to-b from-rmc-green-light/40 to-white p-8 md:p-10">
            <h2 className={`text-center text-2xl md:text-3xl font-bold text-gray-900 mb-8 ${isAr ? 'font-arabic' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
              {pick({ en: 'Duas to begin with', rw: 'Amasengesho yo gutangirana', ar: 'أدعية للبداية' }, locale)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {DUAS.map((d, i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-100 p-6 text-center">
                  <p className="font-arabic text-rmc-green-dark text-2xl md:text-3xl leading-loose mb-3" dir="rtl">{d.arabic}</p>
                  <p className="text-gray-600 text-sm italic mb-1">{d.translit}</p>
                  <p className={`text-gray-500 text-sm ${isAr ? 'font-arabic' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>{pick(d.meaning, locale)}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Find a school — open interactive map */}
        <Reveal>
          <section className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 flex items-start gap-4" dir={isAr ? 'rtl' : 'ltr'}>
              <div className="shrink-0 w-12 h-12 rounded-xl bg-rmc-green-light flex items-center justify-center text-rmc-green">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-xl md:text-2xl font-bold text-gray-900 mb-1 ${isAr ? 'font-arabic' : ''}`}>
                  {pick({ en: 'Find a mosque or school near you', rw: 'Shaka umusigiti cyangwa ishuri hafi yawe', ar: 'ابحث عن مسجد أو مدرسة قريبة منك' }, locale)}
                </h2>
                <p className={`text-gray-500 text-sm leading-relaxed ${isAr ? 'font-arabic' : ''}`}>
                  {pick(
                    {
                      en: 'Tap "Find schools near me" to locate the nearest Islamic school or mosque, get directions, and connect with a local teacher.',
                      rw: 'Kanda "Shaka amashuri hafi yanjye" ushake ishuri ry\'Abayisilamu cyangwa umusigiti uri hafi, ubone inzira, uhuze n\'umwarimu wo aho.',
                      ar: 'اضغط "ابحث عن مدارس قريبة" لتحديد أقرب مدرسة إسلامية أو مسجد، واحصل على الاتجاهات، وتواصل مع معلّم محلي.',
                    },
                    locale,
                  )}
                </p>
              </div>
            </div>

            <NearestSchoolMap
              locateLabel={pick({ en: 'Find schools near me', rw: 'Shaka amashuri hafi yanjye', ar: 'ابحث عن مدارس قريبة' }, locale)}
              locatingLabel={pick({ en: 'Locating…', rw: 'Birashakishwa…', ar: 'جارٍ تحديد الموقع…' }, locale)}
              nearestLabel={pick({ en: 'Nearest', rw: 'Hafi cyane', ar: 'الأقرب' }, locale)}
              directionsLabel={pick({ en: 'Directions', rw: 'Inzira', ar: 'الاتجاهات' }, locale)}
            />
          </section>
        </Reveal>

        {/* Register / contact a mentor */}
        <Reveal>
          <section className="max-w-2xl mx-auto w-full">
            <RegisterForm locale={locale} isAr={isAr} />
          </section>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}

function RegisterForm({ locale, isAr }: { locale: string; isAr: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus('sending');
    try {
      await submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: 'New Muslim — Registration / Mentor Request',
        message:
          `A new Muslim would like guidance and support.\n\n` +
          `Name: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}\n\n` +
          `Message: ${message || '(none)'}`,
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent';

  if (status === 'done') {
    return (
      <div className="rounded-3xl border border-rmc-green/20 bg-rmc-green-light/50 p-8 md:p-10 flex flex-col items-center justify-center text-center" dir={isAr ? 'rtl' : 'ltr'}>
        <CheckCircle2 className="w-12 h-12 text-rmc-green mb-4" />
        <h2 className={`text-xl font-bold text-gray-900 mb-2 ${isAr ? 'font-arabic' : ''}`}>
          {pick({ en: 'May Allah bless you!', rw: 'Allah aguhe umugisha!', ar: 'بارك الله فيك!' }, locale)}
        </h2>
        <p className={`text-gray-600 text-sm ${isAr ? 'font-arabic' : ''}`}>
          {pick(
            {
              en: 'We have received your details. A member of our community will reach out to welcome and support you very soon.',
              rw: 'Twakiriye amakuru yawe. Umwe mu bagize umuryango wacu azaguhamagara akwakire kandi agufashe vuba.',
              ar: 'لقد استلمنا بياناتك. سيتواصل معك أحد أعضاء مجتمعنا قريباً للترحيب بك ودعمك.',
            },
            locale,
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-gray-100 bg-white shadow-sm p-8 md:p-10" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-1.5 text-rmc-green">
        <Users className="w-5 h-5" />
        <h2 className={`text-xl font-bold text-gray-900 ${isAr ? 'font-arabic' : ''}`}>
          {pick({ en: 'Register & get a mentor', rw: 'Iyandikishe ubone umuyobozi', ar: 'سجّل واحصل على مرشد' }, locale)}
        </h2>
      </div>
      <p className={`text-gray-500 text-sm mb-6 ${isAr ? 'font-arabic' : ''}`}>
        {pick(
          {
            en: 'Leave your details and our team will personally guide you on your first steps.',
            rw: 'Siga amakuru yawe, itsinda ryacu rizagufasha ku giti cyawe mu ntambwe zawe za mbere.',
            ar: 'اترك بياناتك وسيرشدك فريقنا شخصياً في خطواتك الأولى.',
          },
          locale,
        )}
      </p>

      <div className="space-y-3">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={pick({ en: 'Full name', rw: 'Amazina yombi', ar: 'الاسم الكامل' }, locale)}
          className={inputCls}
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={pick({ en: 'Email address', rw: 'Aderesi imeyili', ar: 'البريد الإلكتروني' }, locale)}
          className={inputCls}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={pick({ en: 'Phone (optional)', rw: 'Telefone (si itegeko)', ar: 'الهاتف (اختياري)' }, locale)}
          className={inputCls}
        />
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={pick({ en: 'Anything you\'d like us to know? (optional)', rw: 'Hari icyo wifuza ko tumenya? (si itegeko)', ar: 'هل من شيء تودّ إخبارنا به؟ (اختياري)' }, locale)}
          className={`${inputCls} resize-none`}
        />
      </div>

      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600">
          {pick({ en: 'Something went wrong. Please try again.', rw: 'Hari ikitagenze neza. Ongera ugerageze.', ar: 'حدث خطأ ما. حاول مرة أخرى.' }, locale)}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-5 inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-rmc-green text-white text-sm font-bold rounded-full shadow-lg shadow-rmc-green/25 hover:bg-rmc-green-dark disabled:opacity-60 transition-colors"
      >
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {pick({ en: 'Send & connect me', rw: 'Ohereza unyhuze', ar: 'أرسل وتواصل معي' }, locale)}
      </button>
    </form>
  );
}
