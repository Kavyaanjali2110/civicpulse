import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSwitcher() {
  const { currentLang, setLanguage, availableLanguages } = useLanguage();

  return (
    <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700">
      <Globe className="w-3.5 h-3.5 text-teal-700 shrink-0" />
      <select
        value={currentLang}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-white text-slate-800">
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
