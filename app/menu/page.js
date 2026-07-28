'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Dictionnaire de traduction
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

// Sélecteur de langue
function LanguageSelector({ currentLang, onLanguageChange }) {
  const languages = [
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'de', label: 'DE', flag: '🇩🇪' },
  ];

  return (
    <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: currentLang === lang.code ? '#ffffff' : 'transparent',
            boxShadow: currentLang === lang.code ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            color: currentLang === lang.code ? '#000000' : '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
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
    return <div style={{ padding: '32px', textAlign: 'center' }}>{t.loading}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>{t.menuTitle}</h1>
        <LanguageSelector currentLang={lang} onLanguageChange={setLang} />
      </header>

      <main style={{ maxWidth: '448px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {categories.map((cat) => {
          const categoryDishes = dishes.filter((d) => d.category_id === cat.id);
          if (categoryDishes.length === 0) return null;

          return (
            <section key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #f59e0b', paddingBottom: '4px', color: '#1f2937' }}>
                {getCategoryName(cat)}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {categoryDishes.map((dish) => (
                  <div key={dish.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', display: 'flex', gap: '12px', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {dish.image_url && (
                      <img
                        src={dish.image_url}
                        alt={getDishName(dish)}
                        style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontWeight: '600', color: '#111827' }}>{getDishName(dish)}</h3>
                        {getDishDescription(dish) && (
                          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            {getDishDescription(dish)}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>
                          {dish.price} {t.currency}
                        </span>
                        <button style={{ fontSize: '12px', backgroundColor: '#000000', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', fontWeight: '500', border: 'none' }}>
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
