'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '../../../lib/supabaseClient';
import { formatPrice } from '../../../lib/format';
import { t, dishName, dishDescription, translateAllergens, translateRecoLabel, categoryName, announcementTitle, announcementMessage, setExtraUiStrings } from '../../../lib/i18n';
import { ALLERGEN_LIST } from '../../../lib/allergens';
import { flagFor } from '../../../lib/languages';

function seasonGlyph() {
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return '❄️';
  if (month <= 4) return '🌸';
  if (month <= 7) return '☀️';
  return '🍂';
}

function buildTree(categories) {
  const byParent = {};
  categories.forEach((c) => {
    const key = c.parent_id || 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  });
  Object.values(byParent).forEach((list) => list.sort((a, b) => a.position - b.position));
  return byParent;
}

export default function MenuPage() {
  const params = useParams();
  const slug = params?.slug;

  const [restaurant, setRestaurant] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ show_recommendations: false, accent_color: '#7C2D2D', background_color: '#FAF3E6', translate_titles: false, social_facebook: '', social_instagram: '', social_email: '', social_website: '', social_phone: '' });
  const [socialOpen, setSocialOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [openNode, setOpenNode] = useState({});
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [lang, setLang] = useState('fr');
  const [cookieChoice, setCookieChoice] = useState(null);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(null);
  const [dietFilters, setDietFilters] = useState({ vegetarian: false, vegan: false, glutenFree: false });
  const [excludedAllergens, setExcludedAllergens] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const paramsUrl = new URLSearchParams(window.location.search);
    const table = paramsUrl.get('table');
    if (table) setTableNumber(table);
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('cv-cookie-choice') : null;
    setCookieChoice(saved);
  }, []);

  function setCookies(choice) {
    setCookieChoice(choice);
    if (typeof window !== 'undefined') window.localStorage.setItem('cv-cookie-choice', choice);
    setCookieOpen(false);
  }

  useEffect(() => {
    async function loadAll() {
      if (!slug) return;
      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single();
      if (!rest) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setRestaurant(rest);

      const [dishesRes, categoriesRes, settingsRes, announcementsRes] = await Promise.all([
        supabase.from('dishes').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('position', { ascending: true }),
        supabase.from('settings').select('*').eq('restaurant_id', rest.id).single(),
        supabase.from('announcements').select('*').eq('restaurant_id', rest.id).eq('active', true).order('position', { ascending: true }),
      ]);

      if (dishesRes.data) setDishes(dishesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setExtraUiStrings(settingsRes.data.ui_translations || {});
      }
      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      setLoading(false);

      if (settingsRes.data?.track_stats) {
        supabase.from('menu_views').insert({ restaurant_id: rest.id });
      }
    }
    loadAll();
  }, [slug]);

  const byParent = useMemo(() => buildTree(categories), [categories]);

  const visibleDishes = useMemo(() => {
    const anyDietFilter = dietFilters.vegetarian || dietFilters.vegan || dietFilters.glutenFree;
    if (!anyDietFilter && excludedAllergens.length === 0) return dishes;
    return dishes.filter((d) => {
      if (dietFilters.vegetarian && !d.is_vegetarian) return false;
      if (dietFilters.vegan && !d.is_vegan) return false;
      if (dietFilters.glutenFree && !d.is_gluten_free) return false;
      if (excludedAllergens.length > 0 && d.allergens) {
        const dishAllergens = d.allergens.split(',').map((a) => a.trim());
        if (excludedAllergens.some((a) => dishAllergens.includes(a))) return false;
      }
      return true;
    });
  }, [dishes, dietFilters, excludedAllergens]);

  const dishesByCat = useMemo(() => {
    const map = {};
    visibleDishes.forEach((d) => {
      const key = d.category_id || 'sans-categorie';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [visibleDishes]);

  function toggleDietFilter(key) {
    setDietFilters((f) => ({ ...f, [key]: !f[key] }));
  }

  function toggleAllergenFilter(a) {
    setExcludedAllergens((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));
  }

  const activeFilterCount = Object.values(dietFilters).filter(Boolean).length + excludedAllergens.length;

  const socialLinks = useMemo(() => {
    const links = [];
    if (settings.social_facebook) links.push({ key: 'facebook', type: 'facebook', href: settings.social_facebook, label: 'Facebook' });
    if (settings.social_instagram) links.push({ key: 'instagram', type: 'instagram', href: settings.social_instagram, label: 'Instagram' });
    if (settings.social_website) links.push({ key: 'website', type: 'website', href: settings.social_website, label: 'Site web' });
    if (settings.social_email) links.push({ key: 'email', type: 'email', href: `mailto:${settings.social_email}`, label: 'Email' });
    if (settings.social_phone) links.push({ key: 'phone', type: 'phone', href: `tel:${settings.social_phone}`, label: 'Téléphone' });
    return links;
  }, [settings]);

  function addToCart(dish) {
    setCart((c) => ({ ...c, [dish.id]: (c[dish.id] || 0) + 1 }));
  }
  function decFromCart(dishId) {
    setCart((c) => {
      const n = (c[dishId] || 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[dishId];
      else next[dishId] = n;
      return next;
    });
  }

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ dish: dishes.find((d) => d.id === id), qty }))
    .filter((i) => i.dish);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.qty * (i.dish.price ? parseFloat(String(i.dish.price).replace(',', '.').match(/[\d.]+/)?.[0] || 0) : 0), 0);

  if (notFound) {
    return (
      <div className="wrap">
        <div className="awning" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-dim)' }}>
          Cette carte n'existe pas ou n'est plus disponible.
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D', '--paper': settings.background_color || '#FAF3E6' }}>
        <div className="awning" />
        <div style={{ padding: '20px' }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: 'none', border: 'none', color: 'var(--ink-dim)', fontSize: 12,
              cursor: 'pointer', marginBottom: 14, textTransform: 'uppercase',
              letterSpacing: '0.04em', fontFamily: "'Big Shoulders Text', sans-serif",
            }}
          >
            {t(lang, 'back')}
          </button>
          <div style={{ position: 'relative', width: '100%', height: 320, borderRadius: 14, overflow: 'hidden', marginBottom: 14, background: '#EFE6D4' }}>
            {selected.photo_url ? (
              <Image
                src={selected.photo_url}
                alt={selected.name}
                fill
                sizes="(max-width: 600px) 100vw, 600px"
                style={{ objectFit: 'cover' }}
                priority
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-dim)', fontSize: 13 }}>
                {t(lang, 'noPhoto')}
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {dishName(selected, lang, settings.translate_titles)}
            {selected.is_vegetarian && <span title="Végétarien" style={{ marginLeft: 8, fontSize: 18 }}>🌱</span>}
            {selected.is_vegan && <span title="Vegan" style={{ marginLeft: 4, fontSize: 18 }}>🌿</span>}
            {selected.is_gluten_free && <span title="Sans gluten" style={{ marginLeft: 4, fontSize: 18 }}>🌾</span>}
          </div>
          {dishDescription(selected, lang) && (
            <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 6 }}>{dishDescription(selected, lang)}</p>
          )}
          {selected.allergens && (
            <p style={{ color: 'var(--brass)', fontSize: 11.5, marginBottom: 6 }}>{t(lang, 'allergensLabel')} : {translateAllergens(selected.allergens, lang)}</p>
          )}

          {settings.show_recommendations && selected.recommended_dish_id && (() => {
            const reco = dishes.find((d) => d.id === selected.recommended_dish_id);
            if (!reco) return null;
            return (
              <div className="recommend-box" onClick={() => setSelected(reco)}>
                <div
                  className="dish-thumb"
                  style={{ width: 52, height: 52, backgroundImage: reco.photo_url ? `url('${reco.photo_url}')` : 'none' }}
                />
                <div>
                  <div className="recommend-label">{translateRecoLabel(selected.recommendation_label || 'Suggestion', lang)}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{dishName(reco, lang, settings.translate_titles)}</div>
                  <div style={{ color: 'var(--ink-dim)', fontSize: 12 }}>{formatPrice(reco.price)}</div>
                </div>
              </div>
            );
          })()}

          <div style={{ color: 'var(--wine)', fontWeight: 700, fontSize: 17, margin: '16px 0' }}>{formatPrice(selected.price)}</div>

          <button className="btn" onClick={() => { addToCart(selected); setSelected(null); }}>
            {t(lang, 'addToOrder')}
          </button>
        </div>
      </div>
    );
  }

  if (cartOpen) {
    return (
      <div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D', '--paper': settings.background_color || '#FAF3E6' }}>
        <div className="awning" />
        <div style={{ padding: '20px' }}>
          <button
            onClick={() => setCartOpen(false)}
            style={{
              background: 'none', border: 'none', color: 'var(--ink-dim)', fontSize: 12,
              cursor: 'pointer', marginBottom: 14, textTransform: 'uppercase',
              letterSpacing: '0.04em', fontFamily: "'Big Shoulders Text', sans-serif",
            }}
          >
            {t(lang, 'back')}
          </button>
          <h1 className="title" style={{ fontSize: 24, marginBottom: 16 }}>{t(lang, 'myOrder')}</h1>

          {cartItems.length === 0 && (
            <p style={{ color: 'var(--ink-dim)' }}>{t(lang, 'emptyCart')}</p>
          )}

          {cartItems.map(({ dish, qty }) => (
            <div key={dish.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{dishName(dish, lang, settings.translate_titles)}</div>
                <div style={{ color: 'var(--ink-dim)', fontSize: 12.5 }}>{formatPrice(dish.price)}</div>
              </div>
              <button onClick={() => decFromCart(dish.id)} className="btn ghost" style={{ padding: '4px 10px', fontSize: 13 }}>−</button>
              <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
              <button onClick={() => addToCart(dish)} className="btn ghost" style={{ padding: '4px 10px', fontSize: 13 }}>+</button>
            </div>
          ))}

          {cartItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontWeight: 700, fontSize: 16 }}>
              <span>{t(lang, 'total')}</span>
              <span style={{ color: 'var(--wine)' }}>{cartTotal.toFixed(2).replace('.', ',')} €</span>
            </div>
          )}
          {tableNumber && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--wine)', color: '#FAF3E6', borderRadius: 10, textAlign: 'center', fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 17 }}>
              Table {tableNumber}
            </div>
          )}
          <p style={{ color: 'var(--ink-dim)', fontSize: 12, marginTop: 16 }}>
            {t(lang, 'showServer')}
          </p>
        </div>
      </div>
    );}

  return (
    <div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D', '--paper': settings.background_color || '#FAF3E6' }}>
      <div className="awning" />
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="eyebrow">{restaurant?.name || ''} <span className="season-glyph">{seasonGlyph()}</span></div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="toggle-btn"
              style={{
                marginLeft: 0,
                color: activeFilterCount > 0 ? 'var(--wine)' : 'var(--ink-dim)',
                borderColor: activeFilterCount > 0 ? 'var(--wine)' : 'var(--line)',
                background: activeFilterCount > 0 ? 'rgba(124,45,45,0.08)' : 'var(--paper)',
              }}
            >
              🔎 Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangMenuOpen((o) => !o)}
                className="toggle-btn"
                style={{ marginLeft: 0, fontSize: 17, padding: '5px 9px' }}
              >
                {flagFor(lang)}
              </button>
              {langMenuOpen && (
                <div className="cat-menu" style={{ display: 'flex', flexDirection: 'row', padding: 6, gap: 4, minWidth: 0 }}>
                  {['fr', ...((settings.enabled_languages || 'en,de').split(',').map((s) => s.trim()).filter(Boolean))]
                    .filter((code) => code !== lang)
                    .map((code) => (
                      <button
                        key={code}
                        onClick={() => { setLang(code); setLangMenuOpen(false); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 18, padding: '4px 6px', borderRadius: 6,
                        }}
                      >
                        {flagFor(code)}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <h1 className="title">{t(lang, 'menuTitle')}</h1>
        <p className="sub">{t(lang, 'subheading')}</p>

        {filterOpen && (
          <div className="filter-panel">
            <div className="filter-group-title">Régime</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              <button onClick={() => toggleDietFilter('vegetarian')} className={`toggle-btn ${dietFilters.vegetarian ? 'on' : ''}`} style={{ marginLeft: 0 }}>🌱 Végétarien</button>
              <button onClick={() => toggleDietFilter('vegan')} className={`toggle-btn ${dietFilters.vegan ? 'on' : ''}`} style={{ marginLeft: 0 }}>🌿 Vegan</button>
              <button onClick={() => toggleDietFilter('glutenFree')} className={`toggle-btn ${dietFilters.glutenFree ? 'on' : ''}`} style={{ marginLeft: 0 }}>🌾 Sans gluten</button>
            </div>
            <div className="filter-group-title">Exclure un allergène</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALLERGEN_LIST.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAllergenFilter(a)}
                  className={`toggle-btn ${excludedAllergens.includes(a) ? 'on' : ''}`}
                  style={{ marginLeft: 0 }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {announcements.length > 0 && (
        <div style={{ padding: '0 20px 14px' }}>
          {announcements.map((a) => (
            <div key={a.id} className="announcement-card">
              <div className="announcement-title">{announcementTitle(a, lang)}</div>
              <div className="announcement-message">{announcementMessage(a, lang)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '0 20px 90px' }}>
        {loading && <p style={{ color: 'var(--ink-dim)' }}>{t(lang, 'loading')}</p>}
        {!loading && dishes.length === 0 && (
          <p style={{ color: 'var(--ink-dim)' }}>{t(lang, 'empty')}</p>
        )}

        <CategoryLevel
          parentId={null}
          depth={0}
          byParent={byParent}
          dishesByCat={dishesByCat}
          settings={settings}
          dishes={dishes}
          lang={lang}
          openNode={openNode}
          setOpenNode={setOpenNode}
          onView={setSelected}
          onAdd={addToCart}
        />
      </div>

      {cartCount > 0 && (
        <button className="cart-bar" onClick={() => setCartOpen(true)}>
          <span>{t(lang, 'dishesSelected', cartCount)}</span>
          <span>{cartTotal.toFixed(2).replace('.', ',')} €</span>
        </button>
      )}

      {socialLinks.length > 0 && (
        <div className="social-widget" style={{ bottom: cartCount > 0 ? 92 : 20 }}>
          {socialOpen && (
            <div className="social-icons">
              {socialLinks.map((link) => (
                <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className="social-icon" title={link.label}>
                  <SocialIcon type={link.type} />
                </a>
              ))}
            </div>
          )}
          <button className="social-toggle" onClick={() => setSocialOpen((o) => !o)}>
            {socialOpen ? '▲' : '▼'}
          </button>
        </div>
      )}

      <button className="cookie-toggle" onClick={() => setCookieOpen(true)} aria-label="Préférences cookies">
        <svg width="26" height="26" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="var(--wine)" />
          <circle cx="9" cy="8.5" r="1.3" fill="var(--paper)" />
          <circle cx="15" cy="9" r="1" fill="var(--paper)" />
          <circle cx="16.5" cy="13.5" r="1.3" fill="var(--paper)" />
          <circle cx="11.5" cy="15.5" r="1" fill="var(--paper)" />
          <circle cx="8" cy="13" r="0.9" fill="var(--paper)" />
        </svg>
      </button>

      {cookieOpen && (
        <div className="cookie-overlay" onClick={() => setCookieOpen(false)}>
          <div className="cookie-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, margin: '0 0 8px' }}>Cookies</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 16 }}>
              Ce site utilise des cookies techniques pour mémoriser vos préférences (langue, panier). Aucune donnée n'est partagée avec des tiers.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setCookies('refused')}>Refuser</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setCookies('accepted')}>Accepter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryLevel({ parentId, depth, byParent, dishesByCat, settings, dishes, lang, openNode, setOpenNode, onView, onAdd }) {
  const key = parentId || 'root';
  const nodes = byParent[key] || [];

  return (
    <>
      {nodes.map((node) => {
        const isOpen = !!openNode[node.id];
        const directDishes = dishesByCat[node.id] || [];
        const HeaderTag = depth === 0 ? 'accordion-header' : 'accordion-subheader';
        return (
          <div key={node.id} style={{ marginTop: depth === 0 ? 10 : 8, marginLeft: depth > 0 ? 8 : 0 }}>
            <button
              onClick={() => setOpenNode((o) => ({ ...o, [node.id]: !isOpen }))}
              className={HeaderTag}
            >
              <span>{categoryName(node, lang, settings.translate_titles)}</span>
              <span className={`chevron ${isOpen ? 'open' : ''}`}>⌄</span>
            </button>
            {isOpen && (
              <div className={depth === 0 ? 'accordion-body' : 'accordion-subbody'}>
                {directDishes.map((d) => (
                  <DishRow key={d.id} dish={d} dishes={dishes} settings={settings} lang={lang} onView={() => onView(d)} onAdd={() => onAdd(d)} />
                ))}
                <CategoryLevel
                  parentId={node.id}
                  depth={depth + 1}
                  byParent={byParent}
                  dishesByCat={dishesByCat}
                  settings={settings}
                  dishes={dishes}
                  lang={lang}
                  openNode={openNode}
                  setOpenNode={setOpenNode}
                  onView={onView}
                  onAdd={onAdd}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function SocialIcon({ type }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'facebook') {
    return (
      <svg width="20" height="20" viewBox="0 0 320 512" fill="currentColor">
        <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
      </svg>
    );
  }
  if (type === 'instagram') {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17" cy="7" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === 'website') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.2 2.3 3.5 5.4 3.5 8.5s-1.3 6.2-3.5 8.5c-2.2-2.3-3.5-5.4-3.5-8.5S9.8 5.8 12 3.5z" />
      </svg>
    );
  }
  if (type === 'email') {
    return (
      <svg {...common}>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    );
  }
  if (type === 'phone') {
    return (
      <svg {...common}>
        <path d="M6 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2C10.6 18.6 5.4 13.4 4 7.7A2 2 0 0 1 6 3.5z" />
      </svg>
    );
  }
  return null;
}

function DishRow({ dish, dishes, settings, lang, onView, onAdd }) {
  const [justAdded, setJustAdded] = useState(0);
  const reco = settings?.show_recommendations && dish.recommended_dish_id
    ? dishes.find((d) => d.id === dish.recommended_dish_id)
    : null;

  function handleAdd() {
    onAdd();
    setJustAdded((n) => n + 1);
  }
  return (
    <div className={`dish-row ${!dish.available ? 'unavailable' : ''}`}>
      <div
        onClick={dish.available ? onView : undefined}
        className="dish-thumb"
        style={{
          backgroundImage: dish.photo_url ? `url('${dish.photo_url}')` : 'none',
          cursor: dish.available ? 'pointer' : 'default',
        }}
      />
      <div onClick={dish.available ? onView : undefined} style={{ flex: 1, cursor: dish.available ? 'pointer' : 'default' }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>
          {dishName(dish, lang, settings?.translate_titles)}
          {dish.is_vegetarian && <span title="Végétarien" style={{ marginLeft: 6, fontSize: 13 }}>🌱</span>}
          {dish.is_vegan && <span title="Vegan" style={{ marginLeft: 3, fontSize: 13 }}>🌿</span>}
          {dish.is_gluten_free && <span title="Sans gluten" style={{ marginLeft: 3, fontSize: 13 }}>🌾</span>}
          {!dish.available && <span className="badge-epuise">Épuisé</span>}
        </div>
        {dishDescription(dish, lang) && (
          <div style={{ color: 'var(--ink-dim)', fontSize: 11.5, marginTop: 1 }}>{dishDescription(dish, lang)}</div>
        )}
        {reco && (
          <div style={{ color: 'var(--brass)', fontSize: 11, marginTop: 2, fontWeight: 600 }}>
            {translateRecoLabel(dish.recommendation_label || 'Suggestion', lang)} : {dishName(reco, lang, settings?.translate_titles)}
          </div>
        )}
        <div style={{ color: 'var(--wine)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{formatPrice(dish.price)}</div>
      </div>
      {dish.available && (
        <div style={{ position: 'relative' }}>
          {justAdded > 0 && (
            <span key={justAdded} className="plus-one-stamp">+1</span>
          )}
          <button onClick={handleAdd} className="plus-btn" aria-label="Ajouter à la commande">+</button>
        </div>
      )}
    </div>
  );
}
