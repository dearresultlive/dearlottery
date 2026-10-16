import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, type SupportedLang } from '../lib/i18n';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { key: SupportedLang; label: string; short: string; title: string }[] = [
    { key: 'en', label: 'English', short: 'EN', title: 'English' },
    { key: 'bn', label: 'বাংলা', short: 'বাং', title: 'বাংলা (Bengali)' },
    { key: 'hi', label: 'हिंदी', short: 'हिं', title: 'हिंदी (Hindi)' }
  ];

  const current = languages.find(l => l.key === lang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center gap-1 text-[11px] sm:text-xs font-black shadow-2xs transition-colors"
        aria-label="Change Language"
        aria-expanded={isOpen}
      >
        <span className="text-xs">🌐</span>
        <span className="font-bold">{current.short}</span>
        <span className={`text-[10px] text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {languages.map((item) => {
            const isSelected = item.key === lang;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setLang(item.key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-black'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
                {isSelected && <span className="text-blue-700 text-xs font-black">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
