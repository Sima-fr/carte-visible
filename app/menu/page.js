'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';

function parsePrice(str) {
  if (!str) return 0;
  const match = String(str).replace(',', '.').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export default function MenuPage() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [openCat, setOpenCat] = useState({});
  const [openSub, setOpenSub] = useState({});
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
    load();
  }, []);

  const grouped = useMemo(() => {
    const tree = {};
    for (const d of dishes) {
      const cat = d.category || 'Plats';
      const sub = d.subcategory || null;
      if (!tree[cat]) tree[cat] = { direct: [], subs: {} };
      if (sub) {
        if (!tree[cat].subs[sub]) tree[cat].subs[sub] = [];
        tree[cat].subs[sub].push(d);
      } else {
        tree[cat].direct.push(d);
      }
    }
    return tree;
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
  const cartTotal = cartItems.reduce((sum, i) => sum + i.qty * parsePrice(i.dish.price), 0);

  // ---------- Photo detail overlay ----------
  if (selected) {
    return (
      <div className="wrap">
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
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700 }}>{selected.name}</div>
          <div style={{ color: 'var(--wine)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{selected.price}</div>
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
      <div className="wrap">
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
                <div style={{ color: 'var(--ink-dim)', fontSize: 12.5 }}>{dish.price}</div>
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

  // ---------- Main menu (accordion) ----------
  return (
    <div className="wrap">
      <div className="awning" />
      <div className="header">
        <div className="eyebrow">Le Petit Basilic</div>
        <h1 className="title">La carte</h1>
        <p className="sub">Touchez un plat pour voir sa photo, ou ajoutez-le directement à votre commande.</p>
      </div>

      <div style={{ padding: '0 20px 90px' }}>
        {loading && <p style={{ color: 'var(--ink-dim)' }}>Chargement de la carte…</p>}
        {!loading && dishes.length === 0 && (
          <p style={{ color: 'var(--ink-dim)' }}>La carte n'a pas encore été mise à jour.</p>
        )}

        {Object.entries(grouped).map(([catName, catData]) => {
          const isOpen = !!openCat[catName];
          const hasSubs = Object.keys(catData.subs).length > 0;
          return (
            <div key={catName} style={{ marginBottom: 10 }}>
              <button
                onClick={() => setOpenCat((o) => ({ ...o, [catName]: !isOpen }))}
                className="accordion-header"
              >
                <span>{catName}</span>
                <span className={`chevron ${isOpen ? 'open' : ''}`}>⌄</span>
              </button>

              {isOpen && (
                <div className="accordion-body">
                  {catData.direct.map((d) => (
                    <DishRow key={d.id} dish={d} onView={() => setSelected(d)} onAdd={() => addToCart(d)} />
                  ))}

                  {hasSubs && Object.entries(catData.subs).map(([subName, subDishes]) => {
                    const subKey = catName + '::' + subName;
                    const subIsOpen = !!openSub[subKey];
                    return (
                      <div key={subKey} style={{ marginTop: 8 }}>
                        <button
                          onClick={() => setOpenSub((o) => ({ ...o, [subKey]: !subIsOpen }))}
                          className="accordion-subheader"
                        >
                          <span>{subName}</span>
                          <span className={`chevron ${subIsOpen ? 'open' : ''}`}>⌄</span>
                        </button>
                        {subIsOpen && (
                          <div className="accordion-subbody">
                            {subDishes.map((d) => (
                              <DishRow key={d.id} dish={d} onView={() => setSelected(d)} onAdd={() => addToCart(d)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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

function DishRow({ dish, onView, onAdd }) {
  return (
    <div className={`dish-row ${!dish.available ? 'unavailable' : ''}`}>
      <div onClick={dish.available ? onView : undefined} style={{ flex: 1, cursor: dish.available ? 'pointer' : 'default' }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>
          {dish.name}
          {!dish.available && <span className="badge-epuise">Épuisé</span>}
        </div>
        <div style={{ color: 'var(--wine)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{dish.price}</div>
      </div>
      {dish.available && (
        <button onClick={onAdd} className="plus-btn" aria-label="Ajouter à la commande">+</button>
      )}
    </div>
  );
}
