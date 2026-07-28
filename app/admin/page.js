'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { resizeImage } from '../../lib/resizeImage';
import { formatPrice } from '../../lib/format';

const ALLERGEN_LIST = [
  'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait',
  'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques',
];

const emptyForm = {
  name: '', price: '', category: '', newCategory: '', subcategory: '',
  description: '', allergensChecked: [], allergensCustom: '',
};

export default function AdminPage() {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ show_recommendations: false, track_stats: false });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openCat, setOpenCat] = useState({});
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [form, setForm] = useState(emptyForm);
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
    return data || [];
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('position', { ascending: true });
    if (!error) setCategories(data);
    return data || [];
  }

  async function loadSettings() {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (!error && data) setSettings(data);
  }

  async function syncCategories(dishesData, categoriesData) {
    const known = new Set(categoriesData.map((c) => c.name));
    const found = new Set(dishesData.map((d) => d.category || 'Plats'));
    const missing = [...found].filter((name) => !known.has(name));
    if (missing.length === 0) return;
    let maxPos = categoriesData.length ? Math.max(...categoriesData.map((c) => c.position)) : -1;
    for (const name of missing) {
      maxPos += 1;
      await supabase.from('categories').insert({ name, position: maxPos });
    }
    loadCategories();
  }

  useEffect(() => {
    (async () => {
      const [dishesData, categoriesData] = await Promise.all([loadDishes(), loadCategories()]);
      loadSettings();
      syncCategories(dishesData, categoriesData);
    })();
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

  function updateForm(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function toggleAllergen(name) {
    setForm((f) => {
      const has = f.allergensChecked.includes(name);
      return {
        ...f,
        allergensChecked: has
          ? f.allergensChecked.filter((a) => a !== name)
          : [...f.allergensChecked, name],
      };
    });
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setPreview(null);
    setFormOpen(true);
  }

  function startEdit(dish) {
    const existingAllergens = (dish.allergens || '').split(',').map((a) => a.trim()).filter(Boolean);
    const checked = existingAllergens.filter((a) => ALLERGEN_LIST.includes(a));
    const custom = existingAllergens.filter((a) => !ALLERGEN_LIST.includes(a)).join(', ');
    setEditingId(dish.id);
    setForm({
      name: dish.name || '',
      price: dish.price || '',
      category: dish.category || '',
      newCategory: '',
      subcategory: dish.subcategory || '',
      description: dish.description || '',
      allergensChecked: checked,
      allergensCustom: custom,
    });
    setFile(null);
    setPreview(dish.photo_url || null);
    setFormOpen(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setPreview(null);
  }

  async function saveDish() {
    if (!form.name.trim() || !form.price.trim()) return;
    setSaving(true);

    let photo_url = editingId ? (dishes.find((d) => d.id === editingId)?.photo_url ?? null) : null;
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

    const catName = (form.category === '__new__' ? form.newCategory.trim() : form.category.trim()) || 'Plats';
    const allergensCombined = [...form.allergensChecked, ...form.allergensCustom.split(',').map((a) => a.trim()).filter(Boolean)].join(', ');

    const payload = {
      name: form.name.trim(),
      price: form.price.trim(),
      category: catName,
      subcategory: form.subcategory.trim() || null,
      description: form.description.trim() || null,
      allergens: allergensCombined || null,
      photo_url,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('dishes').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('dishes').insert({ ...payload, available: true }));
    }

    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      const existingCat = categories.find((c) => c.name === catName);
      if (!existingCat) {
        const maxPos = categories.length ? Math.max(...categories.map((c) => c.position)) : -1;
        await supabase.from('categories').insert({ name: catName, position: maxPos + 1 });
        loadCategories();
      }
      cancelForm();
      loadDishes();
    }
    setSaving(false);
  }

  async function setRecommendedDrink(dishId, recommendedId) {
    await supabase.from('dishes').update({ recommended_dish_id: recommendedId || null }).eq('id', dishId);
    loadDishes();
  }

  async function setRecommendationLabel(dishId, label) {
    await supabase.from('dishes').update({ recommendation_label: label || 'Suggestion' }).eq('id', dishId);
    loadDishes();
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

  async function renameCategory(cat, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === cat.name) {
      setRenamingId(null);
      return;
    }
    const target = categories.find((c) => c.name === trimmed && c.id !== cat.id);
    if (target) {
      await supabase.from('dishes').update({ category: trimmed }).eq('category', cat.name);
      await supabase.from('categories').delete().eq('id', cat.id);
    } else {
      await supabase.from('categories').update({ name: trimmed }).eq('id', cat.id);
      await supabase.from('dishes').update({ category: trimmed }).eq('category', cat.name);
    }
    setRenamingId(null);
    loadCategories();
    loadDishes();
  }

  async function deleteCategory(cat) {
    const count = grouped[cat.name]?.length || 0;
    if (count > 0) {
      alert(`« ${cat.name} » contient encore ${count} plat${count > 1 ? 's' : ''}. Renomme-la vers une autre catégorie pour fusionner, ou déplace/supprime d'abord ses plats.`);
      return;
    }
    await supabase.from('categories').delete().eq('id', cat.id);
    loadCategories();
  }

  async function toggleAvailable(dish) {
    await supabase.from('dishes').update({ available: !dish.available }).eq('id', dish.id);
    loadDishes();
  }

  async function deleteDish(dish) {
    await supabase.from('dishes').delete().eq('id', dish.id);
    if (editingId === dish.id) cancelForm();
    loadDishes();
  }

  return (
<div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D' }}>      <div className="awning" />
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
                          onClick={() => startEdit(d)}
                          className="btn ghost"
                          style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999 }}
                        >
                          Modifier
                        </button>
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
                            Recommander avec « {d.name} »
                          </label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select
                              value={d.recommended_dish_id || ''}
                              onChange={(e) => setRecommendedDrink(d.id, e.target.value)}
                              style={{
                                flex: 1, background: 'var(--paper)', border: '1px solid var(--line)',
                                color: 'var(--ink)', padding: '7px 8px', borderRadius: 8, fontSize: 12.5,
                              }}
                            >
                              <option value="">Aucune recommandation</option>
                              {dishes.filter((other) => other.id !== d.id).map((other) => (
                                <option key={other.id} value={other.id}>{other.name}</option>
                              ))}
                            </select>
                            {d.recommended_dish_id && (
                              <select
                                value={d.recommendation_label || 'Suggestion'}
                                onChange={(e) => setRecommendationLabel(d.id, e.target.value)}
                                style={{
                                  background: 'var(--paper)', border: '1px solid var(--line)',
                                  color: 'var(--ink)', padding: '7px 8px', borderRadius: 8, fontSize: 12.5,
                                }}
                              >
                                <option value="Suggestion">Suggestion</option>
                                <option value="Boisson conseillée">Boisson conseillée</option>
                                <option value="Plat conseillé">Plat conseillé</option>
                                <option value="Dessert conseillé">Dessert conseillé</option>
                                <option value="Accord parfait">Accord parfait</option>
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

          {!formOpen && (
            <button className="btn ghost" style={{ width: '100%', marginTop: 12 }} onClick={startAdd}>
              + Ajouter un plat
            </button>
          )}

          {formOpen && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
              <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, margin: '0 0 10px' }}>
                {editingId ? 'Modifier le plat' : 'Nouveau plat'}
              </h4>

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
                    {file ? file.name : preview ? 'Remplacer la photo…' : 'Choisir une photo…'}
                  </span>
                  <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="field">
                <label>Nom du plat</label>
                <input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="Ex. Burrata, tomates confites" />
              </div>

              <div className="field">
                <label>Description (optionnel)</label>
                <input value={form.description} onChange={(e) => updateForm({ description: e.target.value })} placeholder="Ex. Sauce maison, légumes de saison…" />
              </div>

              <div className="field">
                <label>Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => updateForm({ category: e.target.value })}
                  style={{
                    width: '100%', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)',
                    padding: '9px 10px', borderRadius: 8, fontSize: 13.5,
                  }}
                >
                  <option value="">Choisir une catégorie…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__new__">+ Nouvelle catégorie…</option>
                </select>
                {form.category === '__new__' && (
                  <input
                    style={{ marginTop: 8 }}
                    value={form.newCategory}
                    onChange={(e) => updateForm({ newCategory: e.target.value })}
                    placeholder="Nom de la nouvelle catégorie"
                  />
                )}
              </div>

              <div className="field">
                <label>Sous-catégorie (optionnel)</label>
                <input value={form.subcategory} onChange={(e) => updateForm({ subcategory: e.target.value })} placeholder="Ex. Tartes flambées" />
              </div>

              <div className="field">
                <label>Allergènes (optionnel)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {ALLERGEN_LIST.map((a) => {
                    const checked = form.allergensChecked.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergen(a)}
                        className={`toggle-btn ${checked ? 'on' : ''}`}
                        style={{ marginLeft: 0 }}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={form.allergensCustom}
                  onChange={(e) => updateForm({ allergensCustom: e.target.value })}
                  placeholder="Autre allergène (séparé par une virgule)"
                />
              </div>

              <div className="field">
                <label>Prix (en €)</label>
                <input value={form.price} onChange={(e) => updateForm({ price: e.target.value })} placeholder="Ex. 14 ou 14,50" />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} disabled={saving} onClick={saveDish}>
                  {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter à la carte'}
                </button>
                <button className="btn ghost" onClick={cancelForm}>Annuler</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', margin: '0 0 14px' }}>Ordre des catégories</h3>
          <p style={{ color: 'var(--ink-dim)', fontSize: 12.5, marginTop: -8, marginBottom: 14 }}>
            L'ordre choisi ici est celui qui s'affiche côté client. Renomme une catégorie vers le nom d'une autre pour les fusionner (utile si tu as un doublon comme « entrées » et « Les entrées »).
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
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 4px', borderBottom: '1px solid var(--line)',
              }}
            >
              {renamingId === c.id ? (
                <>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => renameCategory(c, renameValue)}>
                    OK
                  </button>
                  <button
                    className="btn ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setRenamingId(null)}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                    {c.name} <span style={{ color: 'var(--ink-dim)', fontWeight: 400, fontSize: 12 }}>({grouped[c.name]?.length || 0})</span>
                  </div>
                  <button
                    onClick={() => { setRenamingId(c.id); setRenameValue(c.name); }}
                    className="btn ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    Renommer
                  </button>
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
                  <button
                    onClick={() => deleteCategory(c)}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-dim)', cursor: 'pointer', fontSize: 16 }}
                    title="Supprimer (catégorie vide uniquement)"
                  >
                    ✕
                  </button>
                </>
              )}
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
              <div className="toggle-desc">Suivi des plats commandés par jour et par service.</div><div className="toggle-row" style={{ borderBottom: 'none' }}>
            <div>
              <div className="toggle-label">Couleur de la carte</div>
              <div className="toggle-desc">Change la couleur d'accent vue par tes clients sur /menu.</div>
            </div>
            <input
              type="color"
              value={settings.accent_color || '#7C2D2D'}
              onChange={(e) => setAccentColor(e.target.value)}
              style={{ width: 44, height: 32, border: '1px solid var(--line)', borderRadius: 8, padding: 2, background: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
            />
          </div>
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

  async function toggleSetting(key) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await supabase.from('settings').update({ [key]: next[key] }).eq('id', 1);
  }async function setAccentColor(color) {
    setSettings((s) => ({ ...s, accent_color: color }));
    await supabase.from('settings').update({ accent_color: color }).eq('id', 1);
  }
}
