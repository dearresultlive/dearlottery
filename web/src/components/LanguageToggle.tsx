import React from 'react';
import { useLanguage, type SupportedLang } from '../lib/i18n';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  const languages: { key: SupportedLang; label: string; title: string }[] = [
    { key: 'en', label: 'EN', title: 'English (Default)' },
    { key: 'bn', label: 'বাং', title: 'বাংলা (Bengali)' },
    { key: 'hi', label: 'हिं', title: 'हिंदी (Hindi)' }
  ];

  return (
    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 shadow-2xs flex-shrink-0">
      {languages.map((item) => {
        const isActive = lang === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setLang(item.key)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-black transition-all ${
              isActive
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title={item.title}
            aria-label={item.title}
          >
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
