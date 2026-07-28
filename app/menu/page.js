'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../lib/format';

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
  const [settings, setSettings] = useState({ show_recommendations: false, accent_color: '#7C2D2D', background_color: '#FAF3E6' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [openNode, setOpenNode] = useState({});
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setDishes(data);
      setLoading(false);
    }
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('*').order('position', { ascending: true });
      if (data) setCategories(data);
    }
    async function loadSettings() {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    }
    load();
    loadCategories();
    loadSettings();
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
            ‹ Retour à la carte
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
                Pas encore de photo
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{selected.name}</div>
          {selected.description && (
            <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 6 }}>{selected.description}</p>
          )}
          {selected.allergens && (
            <p style={{ color: 'var(--brass)', fontSize: 11.5, marginBottom: 6 }}>Allergènes : {selected.allergens}</p>
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
                  <div className="recommend-label">{selected.recommendation_label || 'Suggestion'}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{reco.name}</div>
                  <div style={{ color: 'var(--ink-dim)', fontSize: 12 }}>{formatPrice(reco.price)}</div>
                </div>
              </div>
            );
          })()}

          <div style={{ color: 'var(--wine)', fontWeight: 700, fontSize: 17, margin: '16px 0' }}>{formatPrice(selected.price)}</div>

          <button className="btn" onClick={() => { addToCart(selected); setSelected(null); }}>
            + Ajouter à ma commande
          </button>
        </div>
      </div>
    );
  }

  // ---------- Cart overlay ----------
  if (cartOpen) {
    return (
      <div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D' }}>
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
            ‹ Retour à la carte
          </button>
          <h1 className="title" style={{ fontSize: 24, marginBottom: 16 }}>Ma commande</h1>

          {cartItems.length === 0 && (
            <p style={{ color: 'var(--ink-dim)' }}>Aucun plat sélectionné pour l'instant.</p>
          )}

          {cartItems.map(({ dish, qty }) => (
            <div key={dish.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{dish.name}</div>
                <div style={{ color: 'var(--ink-dim)', fontSize: 12.5 }}>{formatPrice(dish.price)}</div>
              </div>
              <button onClick={() => decFromCart(dish.id)} className="btn ghost" style={{ padding: '4px 10px', fontSize: 13 }}>−</button>
              <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
              <button onClick={() => addToCart(dish)} className="btn ghost" style={{ padding: '4px 10px', fontSize: 13 }}>+</button>
            </div>
          ))}

          {cartItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span style={{ color: 'var(--wine)' }}>{cartTotal.toFixed(2).replace('.', ',')} €</span>
            </div>
          )}
          <p style={{ color: 'var(--ink-dim)', fontSize: 12, marginTop: 16 }}>
            Montrez cet écran à votre serveur pour passer commande.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Main menu ----------
  return (
    <div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D' }}>
      <div className="awning" />
      <div className="header">
        <div className="eyebrow">Le Petit Basilic</div>
        <h1 className="title">La carte</h1>
        <p className="sub">Un coup d'œil avant de commander : touchez un plat pour voir la photo en grand — ou ajoutez-le directement à votre commande.</p>
      </div>

      <div style={{ padding: '0 20px 90px' }}>
        {loading && <p style={{ color: 'var(--ink-dim)' }}>Chargement de la carte…</p>}
        {!loading && dishes.length === 0 && (
          <p style={{ color: 'var(--ink-dim)' }}>La carte n'a pas encore été mise à jour.</p>
        )}

        <CategoryLevel
          parentId={null}
          depth={0}
          byParent={byParent}
          dishesByCat={dishesByCat}
          settings={settings}
          dishes={dishes}
          openNode={openNode}
          setOpenNode={setOpenNode}
          onView={setSelected}
          onAdd={addToCart}
        />
      </div>

      {cartCount > 0 && (
        <button className="cart-bar" onClick={() => setCartOpen(true)}>
          <span>{cartCount} plat{cartCount > 1 ? 's' : ''} sélectionné{cartCount > 1 ? 's' : ''}</span>
          <span>{cartTotal.toFixed(2).replace('.', ',')} €</span>
        </button>
      )}
    </div>
  );
}

function CategoryLevel({ parentId, depth, byParent, dishesByCat, settings, dishes, openNode, setOpenNode, onView, onAdd }) {
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
              <span>{node.name}</span>
              <span className={`chevron ${isOpen ? 'open' : ''}`}>⌄</span>
            </button>
            {isOpen && (
              <div className={depth === 0 ? 'accordion-body' : 'accordion-subbody'}>
                {directDishes.map((d) => (
                  <DishRow key={d.id} dish={d} dishes={dishes} settings={settings} onView={() => onView(d)} onAdd={() => onAdd(d)} />
                ))}
                <CategoryLevel
                  parentId={node.id}
                  depth={depth + 1}
                  byParent={byParent}
                  dishesByCat={dishesByCat}
                  settings={settings}
                  dishes={dishes}
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

function DishRow({ dish, dishes, settings, onView, onAdd }) {
  const reco = settings?.show_recommendations && dish.recommended_dish_id
    ? dishes.find((d) => d.id === dish.recommended_dish_id)
    : null;
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
          {dish.name}
          {!dish.available && <span className="badge-epuise">Épuisé</span>}
        </div>
        {dish.description && (
          <div style={{ color: 'var(--ink-dim)', fontSize: 11.5, marginTop: 1 }}>{dish.description}</div>
        )}
        {reco && (
          <div style={{ color: 'var(--brass)', fontSize: 11, marginTop: 2, fontWeight: 600 }}>
            {dish.recommendation_label || 'Suggestion'} : {reco.name}
          </div>
        )}
        <div style={{ color: 'var(--wine)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{formatPrice(dish.price)}</div>
      </div>
      {dish.available && (
        <button onClick={onAdd} className="plus-btn" aria-label="Ajouter à la commande">+</button>
      )}
    </div>
  );
}
