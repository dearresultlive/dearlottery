import React from 'react';
import { useLanguage } from '../lib/i18n';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg sm:rounded-xl border border-slate-300 shadow-2xs flex-shrink-0">
      <button
        type="button"
        onClick={() => setLang('bn')}
        className={`px-1.5 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black transition-all ${
          lang === 'bn'
            ? 'bg-blue-700 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="বাংলা ভাষায় দেখুন"
      >
        <span>বাংলা</span>
      </button>

      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-1.5 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black transition-all ${
          lang === 'en'
            ? 'bg-blue-700 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="View in English"
      >
        <span>EN</span>
      </button>
    </div>
  );
}
