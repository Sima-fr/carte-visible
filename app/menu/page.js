'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const translations = {
  fr: {
    menuTitle: "Coup d'Œil",
    addToCart: "Ajouter au panier",
    currency: "€",
    loading: "Chargement de la carte...",
  },
  en: {
    menuTitle: "Menu",
    addToCart: "Add to cart",
    currency: "€",
    loading: "Loading menu...",
  },
  de: {
    menuTitle: "Speisekarte",
    addToCart: "Hinzufügen",
    currency: "€",
    loading: "Speisekarte wird geladen...",
  }
};

function LanguageSelector({ currentLang, onLanguageChange }) {
  const languages = [
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'de', label: 'DE', flag: '🇩🇪' },
  ];

  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            currentLang === lang.code
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function MenuPage() {
  const [lang, setLang] = useState('fr');
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = translations[lang] || translations.fr;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('position', { ascending: true });
        
      const { data: dishData } = await supabase
        .from('dishes')
        .select('*');

      if (catData) setCategories(catData);
      if (dishData) setDishes(dishData);
      setLoading(false);
    }

    fetchData();
  }, []);

  const getCategoryName = (cat) => {
    if (lang === 'en' && cat.name_en) return cat.name_en;
    if (lang === 'de' && cat.name_de) return cat.name_de;
    return cat.name;
  };

  const getDishName = (dish) => {
    if (lang === 'en' && dish.name_en) return dish.name_en;
    if (lang === 'de' && dish.name_de) return dish.name_de;
    return dish.name;
  };

  const getDishDescription = (dish) => {
    if (lang === 'en' && dish.description_en) return dish.description_en;
    if (lang === 'de' && dish.description_de) return dish.description_de;
    return dish.description;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        {t.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex justify-between items-center max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t.menuTitle}</h1>
        <LanguageSelector currentLang={lang} onLanguageChange={setLang} />
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex flex-col gap-8">
        {categories.map((cat) => {
          const categoryDishes = dishes.filter((d) => d.category_id === cat.id);
          if (categoryDishes.length === 0) return null;

          return (
            <section key={cat.id} className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-amber-500 pb-1 w-fit">
                {getCategoryName(cat)}
              </h2>

              <div className="flex flex-col gap-3">
                {categoryDishes.map((dish) => (
                  <div 
                    key={dish.id} 
                    className="bg-white rounded-2xl p-3 flex gap-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {dish.image_url && (
                      <img
                        src={dish.image_url}
                        alt={getDishName(dish)}
                        className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base leading-snug">{getDishName(dish)}</h3>
                        {getDishDescription(dish) && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {getDishDescription(dish)}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-sm text-gray-900">
                          {dish.price} {t.currency}
                        </span>
                        <button className="text-xs bg-black text-white px-3 py-1.5 rounded-xl font-medium active:scale-95 transition-transform">
                          {t.addToCart}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
