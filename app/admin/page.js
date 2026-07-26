'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { resizeImage } from '../../lib/resizeImage';
import { formatPrice } from '../../lib/format';

export default function AdminPage() {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ show_recommendations: false, track_stats: false });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [openCat, setOpenCat] = useState({});
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadDishes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setDishes(data);
    setLoading(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('position', { ascending: true });
    if (!error) setCategories(data);
  }

  async function loadSettings() {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (!error && data) setSettings(data);
  }

  async function toggleSetting(key) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await supabase.from('settings').update({ [key]: next[key] }).eq('id', 1);
  }

  async function setRecommendedDrink(dishId, recommendedId) {
    await supabase.from('dishes').update({ recommended_dish_id: recommendedId || null }).eq('id', dishId);
    loadDishes();
  }

  useEffect(() => {
    loadDishes();
    loadCategories();
    loadSettings();
  }, []);

  const grouped = useMemo(() => {
    const tree = {};
    for (const d of dishes) {
      const cat = d.category || 'Plats';
      if (!tree[cat]) tree[cat] = [];
      tree[cat].push(d);
    }
    return tree;
  }, [dishes]);

  function categoryRank(catName) {
    const idx = categories.findIndex((c) => c.name === catName);
    return idx === -1 ? 999 : idx;
  }

  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function addDish() {
    if (!name.trim() || !price.trim()) return;
    setSaving(true);

    let photo_url = null;
    if (file) {
      let toUpload = file;
      try {
        toUpload = await resizeImage(file, 1080, 0.75);
      } catch (e) {
        toUpload = file;
      }
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, toUpload, { contentType: 'image/jpeg' });
      if (uploadError) {
        alert("Erreur lors de l'envoi de la photo : " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(path);
      photo_url = publicUrlData.publicUrl;
    }

    const catName = category.trim() || 'Plats';

    const { error } = await supabase.from('dishes').insert({
      name: name.trim(),
      price: price.trim(),
      category: catName,
      subcategory: subcategory.trim() || null,
      photo_url,
      available: true,
    });

    if (error) {
      alert("Erreur lors de l'ajout du plat : " + error.message);
    } else {
      const existing = categories.find((c) => c.name === catName);
      if (!existing) {
        const maxPos = categories.length ? Math.max(...categories.map((c) => c.position)) : -1;
        await supabase.from('categories').insert({ name: catName, position: maxPos + 1 });
        loadCategories();
      }
      setName('');
      setPrice('');
      setCategory('');
      setSubcategory('');
      setFile(null);
      setPreview(null);
      setFormOpen(false);
      loadDishes();
    }
    setSaving(false);
  }

  async function moveCategory(index, dir) {
    const other = index + dir;
    if (other < 0 || other >= categories.length) return;
    const a = categories[index];
    const b = categories[other];
    await supabase.from('categories').update({ position: b.position }).eq('id', a.id);
    await supabase.from('categories').update({ position: a.position }).eq('id', b.id);
    loadCategories();
  }

  async function toggleAvailable(dish) {
    await supabase.from('dishes').update({ available: !dish.available }).eq('id', dish.id);
    loadDishes();
  }

  async function deleteDish(dish) {
    await supabase.from('dishes').delete().eq('id', dish.id);
    loadDishes();
  }

  return (
    <div className="wrap">
      <div className="awning" />
      <div className="header">
        <div className="eyebrow">Espace restaurateur</div>
        <h1 className="title">Ma carte</h1>
        <p className="sub">
          Ajoutez, mettez à jour ou retirez des plats. Les changements sont visibles côté client immédiatement.{' '}
          <a href="/menu" style={{ color: 'var(--wine)', fontWeight: 600 }}>Voir la carte client →</a>
        </p>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces, serif', margin: '0 0 14px' }}>
            {loading ? 'Chargement…' : `${dishes.length} plat${dishes.length > 1 ? 's' : ''}`}
          </h3>

          {Object.entries(grouped)
            .sort((a, b) => categoryRank(a[0]) - categoryRank(b[0]))
            .map(([catName, catDishes]) => {
              const isOpen = openCat[catName] !== false;
              return (
                <div key={catName} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setOpenCat((o) => ({ ...o, [catName]: !isOpen }))}
                    className="accordion-subheader"
                    style={{ width: '100%' }}
                  >
                    <span>{catName} <span style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>({catDishes.length})</span></span>
                    <span className={`chevron ${isOpen ? 'open' : ''}`}>⌄</span>
                  </button>
                  {isOpen && catDishes.map((d) => (
                    <div key={d.id}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 4px', borderBottom: settings.show_recommendations ? 'none' : '1px solid var(--line)',
                        }}
                      >
                        <div
                          style={{
                            width: 50, height: 50, borderRadius: 10, flexShrink: 0,
                            backgroundColor: '#EFE6D4', backgroundSize: 'cover', backgroundPosition: 'center',
                            backgroundImage: d.photo_url ? `url('${d.photo_url}')` : 'none',
                            border: '1px solid var(--line)',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                          <div style={{ color: 'var(--ink-dim)', fontSize: 12.5 }}>{formatPrice(d.price)}</div>
                          {d.subcategory && (
                            <div style={{ color: 'var(--brass)', fontSize: 10.5, marginTop: 2 }}>{d.subcategory}</div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleAvailable(d)}
                          className="btn ghost"
                          style={{
                            fontSize: 11, padding: '6px 10px', borderRadius: 999,
                            color: d.available ? 'var(--herb)' : 'var(--brick)',
                            borderColor: d.available ? 'rgba(76,107,65,0.35)' : 'rgba(184,84,58,0.35)',
                          }}
                        >
                          {d.available ? 'Dispo' : 'Épuisé'}
                        </button>
                        <button
                          onClick={() => deleteDish(d)}
                          style={{ background: 'none', border: 'none', color: 'var(--ink-dim)', cursor: 'pointer', fontSize: 16 }}
                        >
                          ✕
                        </button>
                      </div>
                      {settings.show_recommendations && (
                        <div style={{ padding: '0 4px 10px 66px', borderBottom: '1px solid var(--line)' }}>
                          <label style={{ fontSize: 10.5, color: 'var(--ink-dim)', display: 'block', marginBottom: 3 }}>
                            Boisson conseillée avec « {d.name} »
                          </label>
                          <select
                            value={d.recommended_dish_id || ''}
                            onChange={(e) => setRecommendedDrink(d.id, e.target.value)}
                            style={{
                              width: '100%', background: 'var(--paper)', border: '1px solid var(--line)',
                              color: 'var(--ink)', padding: '7px 8px', borderRadius: 8, fontSize: 12.5,
                            }}
                          >
                            <option value="">Aucune recommandation</option>
                            {dishes.filter((other) => other.id !== d.id).map((other) => (
                              <option key={other.id} value={other.id}>{other.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

          <button className="btn ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setFormOpen(!formOpen)}>
            + Ajouter un plat
          </button>

          {formOpen && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
              <div className="field">
                <label>Photo du plat</label>
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    border: '1px dashed var(--line)', borderRadius: 10, padding: 10, background: 'var(--paper)',
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                      backgroundColor: '#EFE6D4', backgroundSize: 'cover', backgroundPosition: 'center',
                      backgroundImage: preview ? `url('${preview}')` : 'none',
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
                    {file ? file.name : 'Choisir une photo…'}
                  </span>
                  <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="field">
                <label>Nom du plat</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Burrata, tomates confites" />
              </div>
              <div className="field">
                <label>Prix (en €)</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex. 14 ou 14,50" />
              </div>
              <div className="field">
                <label>Catégorie</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex. Les entrées, Les plats, Desserts…" />
              </div>
              <div className="field">
                <label>Sous-catégorie (optionnel)</label>
                <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Ex. Tartes flambées" />
              </div>
              <button className="btn" style={{ width: '100%' }} disabled={saving} onClick={addDish}>
                {saving ? 'Ajout en cours…' : 'Ajouter à la carte'}
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', margin: '0 0 14px' }}>Ordre des catégories</h3>
          <p style={{ color: 'var(--ink-dim)', fontSize: 12.5, marginTop: -8, marginBottom: 14 }}>
            L'ordre choisi ici est celui qui s'affiche côté client.
          </p>
          {categories.length === 0 && (
            <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
              Les catégories apparaîtront ici dès que tu auras ajouté un plat.
            </p>
          )}
          {categories.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 4px', borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              <button
                onClick={() => moveCategory(i, -1)}
                disabled={i === 0}
                className="btn ghost"
                style={{ padding: '4px 12px', fontSize: 13 }}
              >
                ▲
              </button>
              <button
                onClick={() => moveCategory(i, 1)}
                disabled={i === categories.length - 1}
                className="btn ghost"
                style={{ padding: '4px 12px', fontSize: 13 }}
              >
                ▼
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', margin: '0 0 4px' }}>Réglages</h3>
          <p style={{ color: 'var(--ink-dim)', fontSize: 12.5, marginBottom: 10 }}>
            Active ou désactive ces fonctionnalités selon tes besoins.
          </p>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Recommandations de boissons</div>
              <div className="toggle-desc">Suggère une boisson conseillée quand le client regarde un plat.</div>
            </div>
            <button
              className={`toggle-btn ${settings.show_recommendations ? 'on' : ''}`}
              onClick={() => toggleSetting('show_recommendations')}
            >
              {settings.show_recommendations ? 'Activé' : 'Désactivé'}
            </button>
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Statistiques</div>
              <div className="toggle-desc">Suivi des plats commandés par jour et par service.</div>
            </div>
            <button
              className={`toggle-btn ${settings.track_stats ? 'on' : ''}`}
              onClick={() => toggleSetting('track_stats')}
            >
              {settings.track_stats ? 'Activé' : 'Désactivé'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
