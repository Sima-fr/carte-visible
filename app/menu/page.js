'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';

export default function MenuPage() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

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
            {selected.photo_url && (
              <Image
                src={selected.photo_url}
                alt={selected.name}
                fill
                sizes="(max-width: 600px) 100vw, 600px"
                style={{ objectFit: 'cover' }}
                priority
              />
            )}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700 }}>{selected.name}</div>
          <div style={{ color: 'var(--wine)', fontWeight: 700, fontSize: 15 }}>{selected.price}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="awning" />
      <div className="header">
        <div className="eyebrow">Le Petit Basilic</div>
        <h1 className="title">La carte</h1>
        <p className="sub">Touchez un plat pour l'agrandir.</p>
      </div>

      <div
        style={{
          padding: '0 20px', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12,
        }}
      >
        {loading && <p style={{ color: 'var(--ink-dim)' }}>Chargement de la carte…</p>}
        {!loading && dishes.length === 0 && (
          <p style={{ color: 'var(--ink-dim)' }}>La carte n'a pas encore été mise à jour.</p>
        )}
        {dishes.map((d) => (
          <div
            key={d.id}
            onClick={() => d.available && setSelected(d)}
            className="card"
            style={{
              padding: 0, overflow: 'hidden', cursor: d.available ? 'pointer' : 'default',
              opacity: d.available ? 1 : 0.45, position: 'relative',
            }}
          >
            {!d.available && (
              <span
                style={{
                  position: 'absolute', top: 8, right: 8, background: 'var(--brick)', color: '#FAF3E6',
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999,
                }}
              >
                Épuisé
              </span>
            )}
            <div style={{ position: 'relative', width: '100%', height: 120, background: '#EFE6D4' }}>
              {d.photo_url && (
                <Image
                  src={d.photo_url}
                  alt={d.name}
                  fill
                  sizes="150px"
                  style={{ objectFit: 'cover' }}
                  loading="lazy"
                />
              )}
            </div>
            <div style={{ padding: '8px 10px 4px', fontWeight: 600, fontSize: 13 }}>{d.name}</div>
            <div style={{ padding: '0 10px 10px', color: 'var(--ink-dim)', fontSize: 12 }}>{d.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
