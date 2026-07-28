import { useState } from 'react';
import LanguageSelector from '../components/LanguageSelector';
export default function Home() {
  const [lang, setLang] = useState('fr');
  const t = translations[lang] || translations.fr;

  return (
    <>
      <header className="flex justify-between items-center p-4 bg-white border-b">
        <h1 className="text-xl font-bold">{t.menuTitle}</h1>
        <LanguageSelector currentLang={lang} onLanguageChange={setLang} />
      </header>

      <div className="wrap">
        <div className="awning" />
        <div className="header">
          <div className="eyebrow">Coup d'Œil</div>
          <h1 className="title">La carte de votre restaurant, en photos</h1>
          <p className="sub">
            <a className="btn" href="/admin" style={{ display: 'inline-block', textDecoration: 'none', marginRight: 10 }}>
              Espace restaurateur
            </a>
            <a className="btn ghost" href="/menu" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Voir la carte (vue client)
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
