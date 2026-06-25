import { Tri, tri } from './client';

/** One "pillar" card in the Areas of Intervention section. */
export interface AreaItem {
  /** lucide icon name, resolved to a component on the landing side. */
  icon: string;
  title: Tri;
  description: Tri;
  slug: string;
  richContent?: Tri;
  /** File-server key for the hero/cover image (e.g. "areas/dawah-hero.jpg"). */
  imageKey?: string;
  /** File-server keys for additional gallery images shown on the detail page. */
  galleryImages?: string[];
}

export interface AreasContent {
  eyebrow: Tri;
  title: Tri;
  titleAccent: Tri;
  lede: Tri;
  items: AreaItem[];
}

/** Seeded from the live landing (AreasOfInterventionSection) — English canonical. */
export const AREAS_DEFAULT: AreasContent = {
  eyebrow: tri('Our Impact', "Ingaruka zacu", 'أثرنا'),
  title: tri('Areas of', "Inzego z'", 'مجالات'),
  titleAccent: tri('Intervention', 'Ibikorwa', 'التدخل'),
  lede: tri(
    'RMC works across four strategic pillars to uplift, educate, and connect the Muslim community of Rwanda — from local mosques to global partnerships.',
    "RMC ikorera mu nkingi enye z'ingenzi mu guteza imbere, kwigisha no guhuza umuryango w'Abayisilamu wo mu Rwanda — kuva mu misigiti yo mu turere kugeza ku bufatanye mpuzamahanga.",
    'يعمل المجتمع الإسلامي الرواندي عبر أربع ركائز استراتيجية للنهوض بالمجتمع المسلم في رواندا وتعليمه وربطه — من المساجد المحلية إلى الشراكات العالمية.',
  ),
  items: [
    {
      icon: 'BookOpen',
      slug: 'dawah',
      title: tri('Dawah', 'Kwamamaza Idini', 'الدعوة'),
      description: tri(
        'Spreading the true teachings of Islam through peaceful outreach and guidance.',
        "Gukwirakwiza inyigisho z'ukuri za Isilamu binyuze mu kugera ku bantu mu mahoro no kuyobora.",
        'نشر تعاليم الإسلام الصحيحة من خلال الدعوة السلمية والإرشاد.',
      ),
      richContent: tri(
        `<h2>Our Dawah Mission</h2>
<p>The Rwanda Muslim Community's Dawah pillar is dedicated to sharing the authentic teachings of Islam with clarity, compassion, and respect for every individual. Our outreach spans mosques, schools, prisons, hospitals, and community centres across all five provinces of Rwanda.</p>

<h3>What We Do</h3>
<ul>
  <li><strong>Friday Khutbah Programme:</strong> Coordinated sermons delivered at over 600 registered mosques, ensuring consistent and accurate Islamic messaging throughout the country.</li>
  <li><strong>New Muslim Support:</strong> Dedicated guidance, Arabic literacy classes, and mentorship for individuals who have embraced Islam.</li>
  <li><strong>Prison & Hospital Outreach:</strong> Weekly visits to correctional facilities and public hospitals, providing spiritual support and Islamic literature.</li>
  <li><strong>Media & Digital Dawah:</strong> A growing library of audio, video, and written content in Kinyarwanda, French, English, and Arabic distributed via radio, social media, and our website.</li>
  <li><strong>Interfaith Dialogue:</strong> Structured engagement with Christian, Catholic, and other faith communities to build bridges of mutual respect and understanding.</li>
</ul>

<h3>Impact in Numbers</h3>
<p>Since 2010, our Dawah programme has reached over 200,000 individuals directly through in-person events, and millions more through radio broadcasts and digital channels. We have supported more than 3,000 new Muslims in their transition to Islamic practice.</p>

<h3>Get Involved</h3>
<p>Qualified scholars and volunteers are welcome to join our Dawah teams. Contact the RMC Dawah Department to learn about upcoming training sessions and deployment opportunities across Rwanda.</p>`,

        `<h2>Intego yacu y'Ubwamamazan</h2>
<p>Inkingi ya Dawah y'Umuryango w'Abayisilamu wo mu Rwanda ijya imbere mu gusangira inyigisho z'ukuri za Isilamu mu buryo bw'urukundo n'ubwubahane. Ibikorwa byacu bigera mu misigiti, amashuri, imfungwa, ibitaro, n'amashyirahamwe mu ntara zose eshanu z'u Rwanda.</p>

<h3>Ibyo Dukora</h3>
<ul>
  <li><strong>Porogaramu ya Khutbah ya Kuwa Gatanu:</strong> Indirimbo ziteganyijwe zihabwa mu misigiti irenga 600 yanditswe, kugirango ubutumwa bw'ukuri bwa Isilamu busakazwe mu gihugu hose.</li>
  <li><strong>Inkunga y'Abayisilamu Bashya:</strong> Ubuyobozi bwihariye, amasomo yo gusoma Icarabu, no guherekeza abatoranyije Isilamu.</li>
  <li><strong>Gusura Imfungwa n'Ibitaro:</strong> Gusura buri cyumweru ibigerwa n'amahoro n'ibitaro by'leta, gutanga inkunga y'umwuka n'ibitabo bya Isilamu.</li>
  <li><strong>Dawah ku Itangazamakuru no Ku Mbuga:</strong> Ububiko bwiyongera bw'amajwi, videwo, n'inyandiko mu Kinyarwanda, Igifaransa, Icyongereza, n'Icarabu.</li>
  <li><strong>Ikiganiro Hagati y'Amadini:</strong> Gukorana n'abakristo, abakatholika, n'amatsinda y'amadini y'andi kugirango twubake ubucuti.</li>
</ul>

<p>Kuva 2010, porogaramu yacu ya Dawah yageze ku bantu barenga 200.000 mu bikorwa by'imbonana, no ku bagezwa amamiliyoni binyuze kuri radiyo no ku mbuga.</p>`,

        `<h2>مهمتنا في الدعوة</h2>
<p>تكرّس ركيزة الدعوة في المجتمع الإسلامي الرواندي جهودها لنشر تعاليم الإسلام الأصيلة بوضوح ورحمة واحترام لكل فرد. يمتد نشاطنا إلى المساجد والمدارس والسجون والمستشفيات ومراكز المجتمع في جميع مقاطعات رواندا الخمس.</p>

<h3>ما نقوم به</h3>
<ul>
  <li><strong>برنامج خطبة الجمعة:</strong> خطب منسّقة تُلقى في أكثر من 600 مسجد مسجّل، لضمان توصيل رسالة إسلامية دقيقة وموحّدة في جميع أنحاء البلاد.</li>
  <li><strong>دعم المسلمين الجدد:</strong> توجيه متخصص ودروس لتعلم اللغة العربية وإرشاد للأفراد الذين اعتنقوا الإسلام.</li>
  <li><strong>التواصل مع السجون والمستشفيات:</strong> زيارات أسبوعية للمرافق الإصلاحية والمستشفيات العامة لتقديم الدعم الروحي والمطبوعات الإسلامية.</li>
  <li><strong>الدعوة الرقمية والإعلامية:</strong> مكتبة متنامية من المحتوى الصوتي والمرئي والمكتوب باللغات الكينيارواندية والفرنسية والإنجليزية والعربية.</li>
  <li><strong>الحوار بين الأديان:</strong> تواصل منظّم مع المجتمعات المسيحية والكاثوليكية وغيرها لبناء جسور التفاهم المتبادل.</li>
</ul>

<p>منذ عام 2010، وصل برنامجنا للدعوة إلى أكثر من 200,000 شخص مباشرةً، وإلى الملايين عبر الإذاعة والقنوات الرقمية.</p>`,
      ),
    },
    {
      icon: 'Heart',
      slug: 'social-development',
      title: tri('Socio Development', "Iterambere ry'Imibereho", 'التنمية الاجتماعية'),
      description: tri(
        'Empowering communities through health, poverty alleviation, and welfare initiatives.',
        "Guha imbaraga abaturage binyuze mu buzima, kurwanya ubukene, n'ibikorwa byo guteza imbere imibereho.",
        'تمكين المجتمعات من خلال الصحة ومكافحة الفقر ومبادرات الرعاية الاجتماعية.',
      ),
      richContent: tri(
        `<h2>Building Resilient Communities</h2>
<p>RMC's Social Development pillar tackles poverty, health disparities, and social vulnerability head-on. We believe that a strong Muslim community is one that cares for its most vulnerable members — orphans, widows, the elderly, the sick, and those living in extreme poverty.</p>

<h3>Core Programmes</h3>
<ul>
  <li><strong>Orphan Sponsorship:</strong> Over 1,200 orphans across Rwanda receive monthly financial support, school materials, and regular check-ins from dedicated volunteers. Our orphan programme is active in all 30 districts.</li>
  <li><strong>Zakat & Sadaqah Distribution:</strong> Coordinated collection and fair distribution of Zakat funds to eligible recipients (the eight categories of Quran 9:60). Annual distribution reaches approximately 15,000 households.</li>
  <li><strong>Medical Camps:</strong> Quarterly free medical check-up camps in rural areas, staffed by volunteer doctors and nurses, providing consultations, basic medication, and referrals.</li>
  <li><strong>Women's Economic Empowerment:</strong> Interest-free micro-loan cooperatives (Ikiremwa) supporting over 400 women to start or expand small businesses.</li>
  <li><strong>Ramadan Relief:</strong> Annual Iftar and food-basket distribution to needy families across Rwanda during the holy month. Last Ramadan, we served 8,000+ families.</li>
</ul>

<h3>Our Impact</h3>
<p>Since 2008, our social development programmes have directly improved the lives of more than 50,000 individuals. We collaborate with the Government of Rwanda, UNICEF, and local NGOs to maximise reach and avoid duplication of services.</p>`,

        `<h2>Kubaka Umuryango Ukomeje</h2>
<p>Inkingi ya Iterambere ry'Imibereho y'RMC irwanya ubukene, inzitizi mu buzima, n'ingaruka z'imibereho ku buryo butaziguye. Twizera ko umuryango w'Abayisilamu ukomeye ni uwo witaho abanya mwaka — inzirakarengane, abapfakazi, abakuru, abarwayi, n'abafite ubukene bwinshi.</p>

<h3>Porogaramu Nyamukuru</h3>
<ul>
  <li><strong>Gusabiriza Inzirakarengane:</strong> Inzirakarengane zirenga 1.200 mu Rwanda zihabwa inkunga y'amafaranga buri kwezi, ibikoresho bya shuri, no gukurikiranwa na ba volunteer. Porogaramu yacu ni iyateguwe mu turere twose 30.</li>
  <li><strong>Kugabanya Zakat na Sadaqah:</strong> Gukusanya no kugabanya neza inkunga ya Zakat ku bantu bembereye. Kugabanya buri mwaka bigera ku ngo zirenga 15.000.</li>
  <li><strong>Amakambi y'Ubuvuzi:</strong> Amakambi y'ubuvuzi buntu buri gihembwe mu turere tw'ibirunga, hakorana n'inzobere mu buvuzi, gutanga inama, imiti, no kohereza ku bitaro.</li>
  <li><strong>Gukomeza Ubukungu bw'Abagore:</strong> Amakoperative atanga inguzanyo zidafite inyungu (Ikiremwa) ashyigikira abagore barenga 400 gutangira cyangwa kongera ubucuruzi bwabo.</li>
  <li><strong>Inkunga ya Ramadani:</strong> Kugabanya imidozi y'Iftar n'ibikoresho by'indyo ku ngo zikennye mu Rwanda mu kwezi kw'ubutagatifu. Ramadani ishize, twafashije ngo zirenga 8.000.</li>
</ul>`,

        `<h2>بناء مجتمعات صامدة</h2>
<p>تواجه ركيزة التنمية الاجتماعية في RMC الفقرَ والتفاوتاتِ الصحية والهشاشةَ الاجتماعية بشكل مباشر. نؤمن أن المجتمع المسلم القوي هو الذي يهتم بأكثر أعضائه ضعفاً — الأيتام والأرامل والمسنّين والمرضى وأولئك الذين يعيشون في فقر مدقع.</p>

<h3>البرامج الأساسية</h3>
<ul>
  <li><strong>كفالة الأيتام:</strong> يتلقى أكثر من 1,200 يتيم في جميع أنحاء رواندا دعماً مالياً شهرياً ومستلزمات مدرسية ومتابعة منتظمة من المتطوعين.</li>
  <li><strong>توزيع الزكاة والصدقات:</strong> جمع منسّق وتوزيع عادل لأموال الزكاة على المستحقين. يصل التوزيع السنوي إلى نحو 15,000 أسرة.</li>
  <li><strong>المخيمات الطبية:</strong> مخيمات فحص طبي مجانية ربع سنوية في المناطق الريفية، يقوم عليها أطباء وممرضات متطوعون.</li>
  <li><strong>تمكين المرأة اقتصادياً:</strong> تعاونيات قروض بدون فوائد (Ikiremwa) تدعم أكثر من 400 امرأة لبدء أعمالهن أو توسيعها.</li>
  <li><strong>إغاثة رمضان:</strong> توزيع سنوي لسلال الإفطار والغذاء على الأسر المحتاجة. في رمضان الماضي، خدمنا أكثر من 8,000 أسرة.</li>
</ul>

<p>منذ عام 2008، أسهمت برامجنا في تحسين حياة أكثر من 50,000 شخص مباشرة. نتعاون مع حكومة رواندا واليونيسف والمنظمات غير الحكومية المحلية لتعظيم الأثر.</p>`,
      ),
    },
    {
      icon: 'GraduationCap',
      slug: 'education',
      title: tri('Education', 'Uburezi', 'التعليم'),
      description: tri(
        'Providing quality secular and Islamic education to the youth across the nation.',
        "Gutanga uburezi bw'isi n'ubwa Isilamu bufite ireme ku rubyiruko mu gihugu hose.",
        'توفير تعليم عام وإسلامي عالي الجودة للشباب في جميع أنحاء البلاد.',
      ),
      richContent: tri(
        `<h2>Nurturing the Next Generation</h2>
<p>Education is the foundation of a thriving Muslim community. RMC's Education pillar operates a network of schools, Quran memorisation centres, scholarship programmes, and teacher-training initiatives — all designed to produce well-rounded graduates who are grounded in both modern knowledge and Islamic values.</p>

<h3>Our Educational Institutions</h3>
<ul>
  <li><strong>Islamic Primary & Secondary Schools:</strong> We oversee 14 integrated schools across Rwanda that follow the national curriculum alongside Islamic studies. Combined enrolment exceeds 8,500 students.</li>
  <li><strong>Madrasa Network:</strong> A network of 85 weekend and evening Quran schools (madrasa) operating in mosques across all provinces, serving over 12,000 children aged 5–18.</li>
  <li><strong>Hifz Centres:</strong> Six dedicated Quran memorisation (Hifz) centres where students complete full memorisation of the Quran in structured 2–4 year programmes. Over 300 Huffaz have graduated since 2005.</li>
  <li><strong>Scholarship Programme:</strong> Annual merit-based scholarships for Muslim students excelling in national examinations, covering university fees, accommodation, and living expenses. Currently supporting 210 university students.</li>
  <li><strong>Teacher Training:</strong> Annual workshops for Islamic studies teachers to improve pedagogy, curriculum alignment, and child-safe teaching practices.</li>
</ul>

<h3>Milestones</h3>
<p>In 2023, RMC-affiliated schools recorded an average national exam pass rate of 94%, surpassing the national average of 81%. Our scholarship graduates are now serving as doctors, engineers, lawyers, and civil servants across Rwanda and beyond.</p>

<p><a href="/en/schools">Explore our schools →</a></p>`,

        `<h2>Guteza Imbere Ikirunga Gikurikira</h2>
<p>Uburezi ni isoko y'umuryango w'Abayisilamu utera imbere. Inkingi y'Uburezi ya RMC igenzura amashuri, inzego zo kwiga Quran, porogaramu z'inkunga, n'amahugurwa y'abarimu — byose bigamije gutunga inzobere zifite inyigisho z'isi no gushingira ku mico ya Isilamu.</p>

<h3>Inzego Zacu z'Uburezi</h3>
<ul>
  <li><strong>Amashuri Abanza n'Ayisumbuye ya Isilamu:</strong> Tugenzura amashuri 14 mu Rwanda akurikira porogaramu y'igihugu hamwe n'inyigisho za Isilamu. Umubare w'abanyeshuri urarenga 8.500.</li>
  <li><strong>Urwego rwa Madrasa:</strong> Amashuri ya Quran y'iminsi y'ikiruhuko n'umugoroba (madrasa) arenga 85 akora mu misigiti, asabira abana barenga 12.000 bo hagati y'imyaka 5–18.</li>
  <li><strong>Inzego za Hifz:</strong> Inzego 6 zihariye zo kwibuka Quran aho abanyeshuri batsinda Quran yose mu ndonzagihe y'imyaka 2–4. Huffaz barenga 300 barangije kuva 2005.</li>
  <li><strong>Porogaramu y'Inkunga:</strong> Inkunga y'imyaka yose ishingiye ku gikorwa kiboneye ku banyeshuri b'Abayisilamu bakunda mu bigeragezo by'igihugu, iriko amafaranga ya kaminuza, utuzu, n'inkunga y'amafaranga yo kubaho. Ubu ishyigikira abanyeshuri ba kaminuza 210.</li>
</ul>

<p>Mu 2023, amashuri yomezwa na RMC yanditse ijanisha ryo gutsinda ry'ubugeni bwa 94%, irenganye ijanisha ry'igihugu rya 81%.</p>

<p><a href="/rw/schools">Reba amashuri yacu →</a></p>`,

        `<h2>تنشئة الجيل القادم</h2>
<p>التعليم هو أساس مجتمع مسلم مزدهر. تُشغّل ركيزة التعليم في RMC شبكة من المدارس ومراكز حفظ القرآن الكريم وبرامج المنح الدراسية ومبادرات تدريب المعلمين — كلها مصمّمة لتخريج خريجين متكاملين متجذّرين في المعرفة الحديثة والقيم الإسلامية.</p>

<h3>مؤسساتنا التعليمية</h3>
<ul>
  <li><strong>المدارس الابتدائية والثانوية الإسلامية:</strong> ندير 14 مدرسة متكاملة في جميع أنحاء رواندا تتبع المنهج الوطني إلى جانب الدراسات الإسلامية. يتجاوز إجمالي الطلاب المسجلين 8,500 طالب.</li>
  <li><strong>شبكة المدارس الدينية:</strong> شبكة تضم 85 مدرسة قرآنية في عطل نهاية الأسبوع وبالمساء في المساجد، تخدم أكثر من 12,000 طفل.</li>
  <li><strong>مراكز الحفظ:</strong> ستة مراكز متخصصة لحفظ القرآن الكريم. تخرّج أكثر من 300 حافظ منذ عام 2005.</li>
  <li><strong>برنامج المنح الدراسية:</strong> منح سنوية قائمة على الجدارة للطلاب المتفوقين. يدعم البرنامج حالياً 210 طالباً جامعياً.</li>
  <li><strong>تدريب المعلمين:</strong> ورش عمل سنوية لمعلمي الدراسات الإسلامية لتحسين أساليب التدريس.</li>
</ul>

<p>في عام 2023، سجّلت المدارس المنتسبة إلى RMC معدل نجاح بلغ 94% في الامتحانات الوطنية، متجاوزةً المعدل الوطني البالغ 81%.</p>

<p><a href="/ar/schools">استكشف مدارسنا ←</a></p>`,
      ),
    },
    {
      icon: 'Globe',
      slug: 'foreign-affairs',
      title: tri('Foreign Affairs', "Imibanire n'Amahanga", 'الشؤون الخارجية'),
      description: tri(
        'Building and maintaining strong international relations and partnerships.',
        "Kubaka no kubungabunga imibanire n'ubufatanye mpuzamahanga bukomeye.",
        'بناء علاقات وشراكات دولية قوية والحفاظ عليها.',
      ),
      richContent: tri(
        `<h2>Rwanda's Voice in the Muslim World</h2>
<p>RMC's Foreign Affairs pillar positions Rwanda as an active, respected participant in the global Muslim community. We build formal partnerships with Islamic organisations worldwide, advocate for Muslim interests through diplomatic channels, and facilitate Rwandan Muslim participation in international events such as Hajj, major conferences, and interfaith summits.</p>

<h3>Key Activities</h3>
<ul>
  <li><strong>Hajj & Umrah Coordination:</strong> RMC is the official Government of Rwanda-recognised body for coordinating annual Hajj pilgrimages. We work directly with the Saudi Ministry of Hajj to secure quotes, manage logistics, health requirements, and pastoral care for Rwandan pilgrims. In 2024, over 1,800 Rwandans performed Hajj under our coordination.</li>
  <li><strong>OIC Engagement:</strong> Active participation in Organisation of Islamic Cooperation (OIC) forums, representing the interests of Rwandan Muslims at the international level.</li>
  <li><strong>Bilateral Partnerships:</strong> Formal cooperation agreements with Islamic institutions in Saudi Arabia, Egypt, Turkey, Qatar, UAE, Malaysia, and Senegal — enabling scholarship exchanges, financial support, and knowledge transfer.</li>
  <li><strong>Diplomatic Liaison:</strong> Regular engagement with Muslim-majority country embassies based in Kigali to strengthen ties and channel support for local development programmes.</li>
  <li><strong>International Conferences:</strong> Rwandan Muslim delegations attend and present at international Islamic conferences, sharing Rwanda's model of peaceful coexistence and reconciliation.</li>
</ul>

<h3>Strategic Vision</h3>
<p>Rwanda's Muslim community is small but increasingly influential on the African and global Islamic stage. Through structured foreign engagement, we attract investment, expertise, and solidarity that directly benefits Muslims at home — while projecting Rwanda as a model of religious harmony and national unity.</p>`,

        `<h2>Ijwi rya Rwanda mu Isi y'Abayisilamu</h2>
<p>Inkingi y'Imibanire n'Amahanga ya RMC ishyira Rwanda nk'umunyamuryango ukora, uwitwa mu muryango w'Abayisilamu ku isi yose. Tubaka amasezerano n'inzego z'Isilamu ku isi yose, tuvugira inyungu z'Abayisilamu mu nzira za diplomasiya, no guherekeza inzego z'Abayisilamu bo mu Rwanda mu bikorwa bya mpuzamahanga nko Hajji, inama nkuru, n'inama z'amadini.</p>

<h3>Ibikorwa by'Ingenzi</h3>
<ul>
  <li><strong>Guhuza Hajji na Umrah:</strong> RMC ni inzego ishinzwe na leta y'u Rwanda guhuza urugendo rwa Hajji buri mwaka. Mu 2024, Abanyarwanda barenga 1.800 bakoze Hajji munsi y'ubuyobozi bwacu.</li>
  <li><strong>Gukorana na OIC:</strong> Kugira uruhare mu mashyirahamwe ya Inama y'Ubufatanye bw'Isilamu (OIC), uhagararira inyungu z'Abayisilamu bo mu Rwanda ku rwego mpuzamahanga.</li>
  <li><strong>Amasezerano y'Amahanga:</strong> Amasezerano yo gukorana n'inzego z'Isilamu muri Arabiya Sawudiya, Misiri, Tike, Katari, UAE, Malaiziya, na Senegali.</li>
  <li><strong>Gukorana na Ambasade:</strong> Gukorana n'ambasade z'ibihugu bikomeye by'Abayisilamu i Kigali.</li>
</ul>`,

        `<h2>صوت رواندا في العالم الإسلامي</h2>
<p>تضع ركيزة الشؤون الخارجية في RMC رواندا بوصفها مشاركاً فاعلاً ومحترماً في المجتمع الإسلامي العالمي. نبني شراكات رسمية مع المنظمات الإسلامية في شتى أنحاء العالم، ونناضل من أجل مصالح المسلمين عبر القنوات الدبلوماسية.</p>

<h3>الأنشطة الرئيسية</h3>
<ul>
  <li><strong>تنسيق الحج والعمرة:</strong> RMC هي الجهة المعترف بها رسمياً من قِبل حكومة رواندا لتنسيق رحلات الحج السنوية. في عام 2024، أدى أكثر من 1,800 رواندي فريضة الحج تحت إشرافنا.</li>
  <li><strong>التفاعل مع منظمة التعاون الإسلامي:</strong> مشاركة فاعلة في منتديات منظمة التعاون الإسلامي (OIC) تمثيلاً لمصالح مسلمي رواندا.</li>
  <li><strong>الشراكات الثنائية:</strong> اتفاقيات تعاون رسمية مع مؤسسات إسلامية في المملكة العربية السعودية ومصر وتركيا وقطر والإمارات وماليزيا والسنغال.</li>
  <li><strong>التنسيق الدبلوماسي:</strong> تواصل منتظم مع سفارات الدول ذات الأغلبية المسلمة في كيغالي لتعزيز العلاقات.</li>
  <li><strong>المؤتمرات الدولية:</strong> تشارك الوفود الإسلامية الرواندية في المؤتمرات الإسلامية الدولية وتقدم تجربة رواندا في التعايش السلمي والمصالحة.</li>
</ul>

<p>من خلال الانخراط الخارجي المنظّم، نجذب الاستثمارات والخبرات والتضامن الذي يعود بالنفع المباشر على مسلمي الداخل، مع تقديم رواندا نموذجاً للانسجام الديني والوحدة الوطنية.</p>`,
      ),
    },
  ],
};
