'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../lib/format';
import { t, dishName, dishDescription, translateAllergens, translateRecoLabel, categoryName } from '../../lib/i18n';

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
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ show_recommendations: false, accent_color: '#7C2D2D', background_color: '#FAF3E6', translate_titles: false });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [openNode, setOpenNode] = useState({});
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [lang, setLang] = useState('fr');

  useEffect(() => {
    async function loadAll() {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', 'le-petit-basilic')
        .single();
      if (!restaurant) {
        setLoading(false);
        return;
      }

      const [dishesRes, categoriesRes, settingsRes] = await Promise.all([
        supabase.from('dishes').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('position', { ascending: true }),
        supabase.from('settings').select('*').eq('restaurant_id', restaurant.id).single(),
      ]);

      if (dishesRes.data) setDishes(dishesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      setLoading(false);
    }
    loadAll();
  }, []);

  const byParent = useMemo(() => buildTree(categories), [categories]);
  const dishesByCat = useMemo(() => {
    const map = {};
    dishes.forEach((d) => {
      const key = d.category_id || 'sans-categorie';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [dishes]);

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

  // ---------- Photo detail overlay ----------
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
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{dishName(selected, lang, settings.translate_titles)}</div>
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

  // ---------- Cart overlay ----------
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
          <p style={{ color: 'var(--ink-dim)', fontSize: 12, marginTop: 16 }}>
            {t(lang, 'showServer')}
          </p>
        </div>
      </div>
    );
  }

  // ---------- Main menu ----------
  return (
    <div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D', '--paper': settings.background_color || '#FAF3E6' }}>
      <div className="awning" />
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="eyebrow">Le Petit Basilic <span className="season-glyph">{seasonGlyph()}</span></div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['fr', 'en', 'de'].map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className="toggle-btn"
                style={{
                  marginLeft: 0,
                  color: lang === code ? 'var(--wine)' : 'var(--ink-dim)',
                  borderColor: lang === code ? 'var(--wine)' : 'var(--line)',
                  background: lang === code ? 'rgba(124,45,45,0.08)' : 'var(--paper)',
                }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <h1 className="title">{t(lang, 'menuTitle')}</h1>
        <p className="sub">{t(lang, 'subheading')}</p>
      </div>

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
