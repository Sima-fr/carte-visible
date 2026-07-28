'use client';

import { Language } from '@/lib/translations';

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function LanguageSelector({ currentLang, onLanguageChange }: LanguageSelectorProps) {
  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'de', label: 'DE', flag: '🇩🇪' },
  ];

  return (
    <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
            currentLang === lang.code
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-500 hover:text-black'
          }`}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
