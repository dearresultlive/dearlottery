import React from 'react';
import { useLanguage } from '../lib/i18n';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-300 shadow-2xs">
      <button
        type="button"
        onClick={() => setLang('bn')}
        className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
          lang === 'bn'
            ? 'bg-blue-700 text-white shadow-xs scale-102'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
        }`}
        title="বাংলা ভাষায় দেখুন"
      >
        <span>বাংলা</span>
      </button>

      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
          lang === 'en'
            ? 'bg-blue-700 text-white shadow-xs scale-102'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
        }`}
        title="View in English"
      >
        <span>EN</span>
      </button>
    </div>
  );
}
