'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Calendar, Clock, MapPin, ArrowRight, Newspaper, Tag } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Activity {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  categoryColor: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: string;
  typeColor: string;
}

const ACTIVITIES: Activity[] = [
  {
    id: '1',
    category: 'Education',
    title: 'RMC Launches Digital Madrassa Program in Kigali',
    excerpt: 'A new online learning platform for Islamic education is now accessible to students across all provinces, reaching over 2,000 children.',
    date: 'June 5, 2025',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=200&auto=format&fit=crop',
    categoryColor: 'bg-violet-100 text-violet-600',
  },
  {
    id: '2',
    category: 'Social',
    title: 'Ramadan Food Distribution Reaches 5,000 Families',
    excerpt: 'RMC partnered with local NGOs to distribute food packages to 5,000 vulnerable Muslim families across Rwanda during the blessed month of Ramadan.',
    date: 'May 20, 2025',
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=200&auto=format&fit=crop',
    categoryColor: 'bg-rose-100 text-rose-600',
  },
  {
    id: '3',
    category: 'Dawa',
    title: 'Annual Imam Training Conference Held in Musanze',
    excerpt: '120 imams from across Rwanda gathered for a 3-day training conference on modern Islamic leadership, digital communication, and community engagement.',
    date: 'April 12, 2025',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=200&auto=format&fit=crop',
    categoryColor: 'bg-emerald-100 text-emerald-600',
  },
];

const EVENTS: Event[] = [
  {
    id: '1',
    title: "Eid al-Adha National Celebration",
    date: 'June 16, 2025',
    time: '08:00 AM',
    location: 'Amahoro National Stadium, Kigali',
    type: 'Religious',
    typeColor: 'bg-rmc-green-light text-rmc-green',
  },
  {
    id: '2',
    title: 'RMC Annual Scholarship Awards Ceremony',
    date: 'June 28, 2025',
    time: '10:00 AM',
    location: 'Kigali Convention Centre',
    type: 'Education',
    typeColor: 'bg-violet-100 text-violet-600',
  },
  {
    id: '3',
    title: 'Muslim Women Leadership Summit',
    date: 'July 5, 2025',
    time: '09:00 AM',
    location: 'Serena Hotel, Kigali',
    type: 'Community',
    typeColor: 'bg-sky-100 text-sky-600',
  },
  {
    id: '4',
    title: 'Quran Recitation Competition — National Finals',
    date: 'July 19, 2025',
    time: '02:00 PM',
    location: 'Grand Mosque of Kigali',
    type: 'Dawa',
    typeColor: 'bg-amber-100 text-amber-600',
  },
  {
    id: '5',
    title: 'RMC General Assembly Meeting',
    date: 'August 2, 2025',
    time: '09:00 AM',
    location: 'RMC Headquarters, Rebero',
    type: 'Governance',
    typeColor: 'bg-gray-100 text-gray-600',
  },
];

export function ActivitiesEventsSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);
  const { ref: leftRef, visible: leftVisible } = useScrollReveal(0.1);
  const { ref: rightRef, visible: rightVisible } = useScrollReveal(0.1);

  return (
    <section className="relative bg-white py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 pattern-light" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={titleRef}
          className={`text-center mb-14 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green animate-pulse" />
            Activities &amp; Events
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Latest &amp; Upcoming
          </h2>
          <p className="text-gray-400 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Follow RMC's most recent activities and mark your calendar for upcoming community events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* Latest Activities — 3 cols */}
          <div
            ref={leftRef}
            className={`lg:col-span-3 transition-all duration-700 ${leftVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-rmc-green/10 rounded-lg flex items-center justify-center">
                  <Newspaper className="w-4 h-4 text-rmc-green" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Latest Activities</h3>
              </div>
              <Link
                href={`/${locale}/blog`}
                className="text-xs font-semibold text-rmc-green flex items-center gap-1 hover:gap-2 transition-all duration-200"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-5">
              {ACTIVITIES.map((activity, i) => (
                <div
                  key={activity.id}
                  className={`group flex gap-4 p-4 rounded-2xl border border-gray-100 hover:border-rmc-green/20 hover:shadow-md bg-white transition-all duration-300 ${
                    leftVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                  style={{ transitionDelay: `${i * 100 + 200}ms` }}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={activity.image}
                      alt={activity.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${activity.categoryColor}`}>
                        <Tag className="w-2.5 h-2.5" />
                        {activity.category}
                      </span>
                      <span className="text-xs text-gray-300">{activity.date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-rmc-green transition-colors duration-200">
                      {activity.title}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{activity.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events — 2 cols */}
          <div
            ref={rightRef}
            className={`lg:col-span-2 transition-all duration-700 delay-150 ${rightVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-rmc-gold/15 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-rmc-gold" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Upcoming Events</h3>
              </div>
              <Link
                href={`/${locale}/contact`}
                className="text-xs font-semibold text-rmc-green flex items-center gap-1 hover:gap-2 transition-all duration-200"
              >
                All Events <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {EVENTS.map((event, i) => (
                <div
                  key={event.id}
                  className={`group p-4 rounded-2xl border border-gray-100 hover:border-rmc-green/20 hover:shadow-md bg-white transition-all duration-300 cursor-pointer ${
                    rightVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                  style={{ transitionDelay: `${i * 80 + 200}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Date block */}
                    <div className="w-12 shrink-0 text-center bg-rmc-green-deep rounded-xl py-2 group-hover:bg-rmc-green transition-colors duration-200">
                      <p className="text-white text-xs font-semibold leading-none">
                        {event.date.split(' ')[0].slice(0, 3).toUpperCase()}
                      </p>
                      <p className="text-rmc-gold text-xl font-bold leading-tight">
                        {event.date.split(' ')[1].replace(',', '')}
                      </p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${event.typeColor}`}>
                        {event.type}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-rmc-green transition-colors duration-200 line-clamp-2">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.location.split(',')[0]}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subscribe CTA */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-rmc-green-deep to-rmc-green text-white">
              <p className="text-sm font-bold mb-1">Never miss an event</p>
              <p className="text-xs text-white/70 mb-3">Get notified about upcoming RMC events in your area.</p>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rmc-gold hover:text-rmc-gold-light transition-colors"
              >
                Subscribe to alerts <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
