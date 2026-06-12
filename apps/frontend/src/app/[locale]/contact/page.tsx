'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MosqueFinder } from '@/components/contact/MosqueFinder';

export default function ContactPage() {
  const t = useTranslations('contact');
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire up to backend
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Header */}
        <section className="bg-gradient-to-r from-rmc-green to-rmc-green-dark text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-white/80 text-lg">{t('subtitle')}</p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
            {/* Contact form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
              {submitted ? (
                <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-800">
                  ✅ {t('form.success')}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { key: 'name', type: 'text', label: t('form.name') },
                    { key: 'email', type: 'email', label: t('form.email') },
                    { key: 'subject', type: 'text', label: t('form.subject') },
                  ].map(({ key, type, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type={type}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
                        value={(formState as Record<string, string>)[key]}
                        onChange={(e) => setFormState((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.message')}</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none resize-none"
                      value={formState.message}
                      onChange={(e) => setFormState((prev) => ({ ...prev, message: e.target.value }))}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-rmc-green text-white font-semibold rounded-lg hover:bg-rmc-green-dark transition-colors"
                  >
                    {t('form.submit')}
                  </button>
                </form>
              )}

              {/* Contact info */}
              <div className="mt-10 space-y-4">
                {[
                  { label: t('address'), value: 'KN 4 Ave, Kigali, Rwanda', icon: '📍' },
                  { label: t('phone'), value: '+250 788 000 000', icon: '📞' },
                  { label: t('email'), value: 'info@rmc.org.rw', icon: '✉️' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-500">{item.label}</div>
                      <div className="text-gray-900">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mosque finder */}
            <div id="find-mosque" className="scroll-mt-28">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('findMosque')}</h2>
              <MosqueFinder />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
