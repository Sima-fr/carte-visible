'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { resizeImage } from '../../lib/resizeImage';
import { formatPrice } from '../../lib/format';
import { translateText } from '../../lib/translate';

const ALLERGEN_LIST = [
  'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait',
  'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques',
];

const emptyForm = {
  name: '', price: '', categoryId: '', newCategory: '',
  description: '', allergensChecked: [], allergensCustom: '',
  nameEn: '', nameDe: '', descriptionEn: '', descriptionDe: '',
};

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

function flattenForSelect(byParent, parentKey, depth, out) {
  const list = byParent[parentKey] || [];
  for (const cat of list) {
    out.push({ id: cat.id, label: '—'.repeat(depth) + (depth > 0 ? ' ' : '') + cat.name });
    flattenForSelect(byParent, cat.id, depth + 1, out);
  }
  return out;
}

function categoryPath(categories, id) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const parts = [];
  let cur = byId[id];
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId[cur.parent_id] : null;
  }
  return parts.join(' › ');
}

export default function AdminPage() {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ show_recommendations: false, track_stats: false, accent_color: '#7C2D2D', background_color: '#FAF3E6', translate_titles: false });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dishes');
  const [editingId, setEditingId] = useState(null);
  const [openDishCat, setOpenDishCat] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [addingChildFor, setAddingChildFor] = useState(null);
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [newChildName, setNewChildName] = useState('');const [translateOpenId, setTranslateOpenId] = useState(null);const [menuOpenId, setMenuOpenId] = useState(null);const [announcements, setAnnouncements] = useState([]);
  const [annFormOpen, setAnnFormOpen] = useState(false);
  const [annEditingId, setAnnEditingId] = useState(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadRestaurant() {
      if (!session) { setRestaurant(null); return; }
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', session.user.id)
        .single();
      setRestaurant(data || null);
    }
    loadRestaurant();
  }, [session]);

  async function handleLogin() {
    setLoginError('');
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) setLoginError("Email ou mot de passe incorrect.");
    setLoggingIn(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function loadDishes() {
    if (!restaurant) return [];
    setLoading(true);
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });
    if (!error) setDishes(data);
    setLoading(false);
    return data || [];
  }

  async function loadCategories() {
    if (!restaurant) return [];
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('position', { ascending: true });
    if (!error) setCategories(data);
    return data || [];
  }

  async function loadSettings() {
    if (!restaurant) return;
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .single();
    if (!error && data) setSettings(data);
  }

useEffect(() => {
    if (!restaurant) return;
    loadDishes();
    loadCategories();
    loadSettings();
    loadAnnouncements();
  }, [restaurant]);

  async function loadAnnouncements() {
    if (!restaurant) return;
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('position', { ascending: true });
    if (data) setAnnouncements(data);
  }

  function startAddAnnouncement() {
    setAnnEditingId(null);
    setAnnTitle('');
    setAnnMessage('');
    setAnnFormOpen(true);
  }

  function startEditAnnouncement(a) {
    setAnnEditingId(a.id);
    setAnnTitle(a.title);
    setAnnMessage(a.message);
    setAnnFormOpen(true);
  }

  function cancelAnnouncementForm() {
    setAnnFormOpen(false);
    setAnnEditingId(null);
    setAnnTitle('');
    setAnnMessage('');
  }

  async function saveAnnouncement() {
    if (!annTitle.trim() || !annMessage.trim()) return;
    if (annEditingId) {
      await supabase.from('announcements').update({ title: annTitle.trim(), message: annMessage.trim() }).eq('id', annEditingId);
    } else {
      const maxPos = announcements.length ? Math.max(...announcements.map((a) => a.position)) : -1;
      await supabase.from('announcements').insert({
        title: annTitle.trim(), message: annMessage.trim(), restaurant_id: restaurant.id, position: maxPos + 1,
      });
    }
    cancelAnnouncementForm();
    loadAnnouncements();
  }

  async function toggleAnnouncementActive(a) {
    await supabase.from('announcements').update({ active: !a.active }).eq('id', a.id);
    loadAnnouncements();
  }

  async function deleteAnnouncement(a) {
    await supabase.from('announcements').delete().eq('id', a.id);
    loadAnnouncements();
  }

  async function moveAnnouncement(index, dir) {
    const other = index + dir;
    if (other < 0 || other >= announcements.length) return;
    const a = announcements[index];
    const b = announcements[other];
    await supabase.from('announcements').update({ position: b.position }).eq('id', a.id);
    await supabase.from('announcements').update({ position: a.position }).eq('id', b.id);
    loadAnnouncements();
  }

  const byParent = useMemo(() => buildTree(categories), [categories]);
  const flatOptions = useMemo(() => flattenForSelect(byParent, 'root', 0, []), [byParent]);
  const dishCountByCat = useMemo(() => {
    const counts = {};
    dishes.forEach((d) => {
      if (d.category_id) counts[d.category_id] = (counts[d.category_id] || 0) + 1;
    });
    return counts;
  }, [dishes]);

  const groupedDishes = useMemo(() => {
    const tree = {};
    for (const d of dishes) {
      const key = d.category_id || 'sans-categorie';
      if (!tree[key]) tree[key] = [];
      tree[key].push(d);
    }
    return tree;
  }, [dishes]);

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
      categoryId: dish.category_id || '',
      newCategory: '',
      description: dish.description || '',
      allergensChecked: checked,
      allergensCustom: custom,
      nameEn: dish.name_en || '',
      nameDe: dish.name_de || '',
      descriptionEn: dish.description_en || '',
      descriptionDe: dish.description_de || '',
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

    let categoryId = form.categoryId;
    if (categoryId === '__new__') {
      const name = form.newCategory.trim();
      if (!name) { setSaving(false); return; }
      const rootList = byParent['root'] || [];
      const maxPos = rootList.length ? Math.max(...rootList.map((c) => c.position)) : -1;
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert({ name, position: maxPos + 1, parent_id: null, restaurant_id: restaurant.id })
        .select()
        .single();
      if (catError) {
        alert("Erreur lors de la création de la catégorie : " + catError.message);
        setSaving(false);
        return;
      }
      categoryId = newCat.id;
      loadCategories();
    }

    const allergensCombined = [...form.allergensChecked, ...form.allergensCustom.split(',').map((a) => a.trim()).filter(Boolean)].join(', ');

    const payload = {
      name: form.name.trim(),
      price: form.price.trim(),
      category_id: categoryId || null,
      description: form.description.trim() || null,
      allergens: allergensCombined || null,
      photo_url,
      name_en: form.nameEn.trim() || null,
      name_de: form.nameDe.trim() || null,
      description_en: form.descriptionEn.trim() || null,
      description_de: form.descriptionDe.trim() || null,restaurant_id: restaurant.id,
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

  async function toggleAvailable(dish) {
    await supabase.from('dishes').update({ available: !dish.available }).eq('id', dish.id);
    loadDishes();
  }

  async function deleteDish(dish) {
    await supabase.from('dishes').delete().eq('id', dish.id);
    if (editingId === dish.id) cancelForm();
    loadDishes();
  }

  // ---------- Category tree management ----------
  async function moveCategory(node, dir) {
    const siblings = byParent[node.parent_id || 'root'];
    const idx = siblings.findIndex((c) => c.id === node.id);
    const other = idx + dir;
    if (other < 0 || other >= siblings.length) return;
    const a = siblings[idx];
    const b = siblings[other];
    await supabase.from('categories').update({ position: b.position }).eq('id', a.id);
    await supabase.from('categories').update({ position: a.position }).eq('id', b.id);
    loadCategories();
  }    async function renameCategory(node, newName) {     const trimmed = newName.trim();     if (!trimmed || trimmed === node.name) {       setRenamingId(null);       return;     }     const siblings = byParent[node.parent_id || 'root'];
    const target = siblings.find((c) => c.name === trimmed && c.id !== node.id);
    if (target) {
      await supabase.from('dishes').update({ category_id: target.id }).eq('category_id', node.id);
      await supabase.from('categories').update({ parent_id: target.id }).eq('parent_id', node.id);
      await supabase.from('categories').delete().eq('id', node.id);
    } else {
      await supabase.from('categories').update({ name: trimmed }).eq('id', node.id);
    }
    setRenamingId(null);
    loadCategories();
    loadDishes();
  }

  async function deleteCategoryNode(node) {
    const hasChildren = (byParent[node.id] || []).length > 0;
    const dishCount = dishCountByCat[node.id] || 0;
    if (hasChildren || dishCount > 0) {
      alert(`« ${node.name} » contient encore ${dishCount} plat${dishCount > 1 ? 's' : ''} et/ou des sous-catégories. Vide-la d'abord (renomme pour fusionner, ou déplace/supprime ses plats).`);
      return;
    }
    await supabase.from('categories').delete().eq('id', node.id);
    loadCategories();
  }

  async function addCategory(parentId, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const siblings = byParent[parentId || 'root'] || [];
    const maxPos = siblings.length ? Math.max(...siblings.map((c) => c.position)) : -1;
    await supabase.from('categories').insert({ name: trimmed, position: maxPos + 1, parent_id: parentId || null, restaurant_id: restaurant.id });
    setAddingChildFor(null);
    setNewChildName('');
    loadCategories();
  }

  async function toggleSetting(key) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await supabase.from('settings').update({ [key]: next[key] }).eq('restaurant_id', restaurant.id);
  }

  async function setAccentColor(color) {
    setSettings((s) => ({ ...s, accent_color: color }));
    await supabase.from('settings').update({ accent_color: color }).eq('restaurant_id', restaurant.id);
  }

  async function setBackgroundColor(color) {
    setSettings((s) => ({ ...s, background_color: color }));
    await supabase.from('settings').update({ background_color: color }).eq('restaurant_id', restaurant.id);
  }
async function setSocialField(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
    const { error } = await supabase.from('settings').update({ [field]: value || null }).eq('restaurant_id', restaurant.id);
    if (error) alert("Erreur d'enregistrement : " + error.message);
  }
  async function setCategoryTranslation(catId, field, value) {
    await supabase.from('categories').update({ [field]: value || null }).eq('id', catId);
    loadCategories();
  }

  async function autoTranslateAll() {
    setAutoTranslating(true);
    try {
      for (const cat of categories) {
        const patch = {};
        if (!cat.name_en) patch.name_en = await translateText(cat.name, 'en');
        if (!cat.name_de) patch.name_de = await translateText(cat.name, 'de');
        if (Object.keys(patch).length) {
          await supabase.from('categories').update(patch).eq('id', cat.id);
        }
      }
      for (const d of dishes) {
        const patch = {};
        if (!d.name_en) patch.name_en = await translateText(d.name, 'en');
        if (!d.name_de) patch.name_de = await translateText(d.name, 'de');
        if (d.description) {
          if (!d.description_en) patch.description_en = await translateText(d.description, 'en');
          if (!d.description_de) patch.description_de = await translateText(d.description, 'de');
        }
        if (Object.keys(patch).length) {
          await supabase.from('dishes').update(patch).eq('id', d.id);
        }
      }
      await loadCategories();
      await loadDishes();
    } finally {
      setAutoTranslating(false);
    }
  }

  if (authLoading) {
    return (
      <div className="wrap">
        <div className="awning" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-dim)' }}>Chargement…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="wrap">
        <div className="awning" />
        <div style={{ padding: '40px 20px', maxWidth: 360, margin: '0 auto' }}>
          <div className="eyebrow">Espace restaurateur</div>
          <h1 className="title" style={{ fontSize: 26 }}>Connexion</h1>
          <p className="sub" style={{ marginBottom: 20 }}>Connecte-toi avec l'email et le mot de passe de ton restaurant.</p>
          <div className="field">
            <label>Email</label>
            <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="ton@email.com" />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {loginError && <p style={{ color: 'var(--brick)', fontSize: 12.5, marginBottom: 10 }}>{loginError}</p>}
          <button className="btn" style={{ width: '100%' }} disabled={loggingIn} onClick={handleLogin}>
            {loggingIn ? 'Connexion…' : 'Se connecter'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ '--wine': settings.accent_color || '#7C2D2D', '--paper': settings.background_color || '#FAF3E6' }}>
      <div className="awning" />
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="eyebrow">Espace restaurateur{restaurant ? ` — ${restaurant.name}` : ''}</div>
          <button onClick={handleLogout} className="btn ghost" style={{ padding: '6px 12px', fontSize: 11 }}>
            Déconnexion
          </button>
        </div>
<h1 className="title">
          {activeTab === 'dishes' && 'Ma carte'}
          {activeTab === 'categories' && 'Mes catégories'}
          {activeTab === 'announcements' && 'Annonces'}
          {activeTab === 'settings' && 'Réglages'}
        </h1>
        <p className="sub">
          {activeTab === 'dishes' && "Ajoutez, mettez à jour ou retirez des plats."}
          {activeTab === 'categories' && "Organisez, réordonnez et traduisez vos catégories et sous-catégories."}
          {activeTab === 'announcements' && "Informe tes clients d'une offre du jour, d'une soirée spéciale ou d'une info importante."}
          {activeTab === 'settings' && "Options, couleurs et traductions de votre carte."}
          {' '}Les changements sont visibles côté client immédiatement.{' '}
          <a href="/menu" style={{ color: 'var(--wine)', fontWeight: 600 }}>Voir la carte client →</a>
        </p>
        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'dishes' ? 'active' : ''}`} onClick={() => setActiveTab('dishes')}>
            🍽️ Ma carte
          </button>
          <button className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            📂 Catégories
          </button>
          <button className={`admin-tab ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>
            📢 Annonces
          </button>
          <button className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            ⚙️ Réglages
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {activeTab === 'dishes' && (
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces, serif', margin: '0 0 14px' }}>
            {loading ? 'Chargement…' : `${dishes.length} plat${dishes.length > 1 ? 's' : ''}`}
          </h3>

          {Object.entries(groupedDishes).map(([catId, catDishes]) => {
            const label = catId === 'sans-categorie' ? 'Sans catégorie' : categoryPath(categories, catId);
            const isOpen = openDishCat[catId] !== false;
            return (
              <div key={catId} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setOpenDishCat((o) => ({ ...o, [catId]: !isOpen }))}
                  className="accordion-subheader"
                  style={{ width: '100%' }}
                >
                  <span>{label} <span style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>({catDishes.length})</span></span>
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
                      </div>
                      <button onClick={() => startEdit(d)} className="btn ghost" style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999 }}>
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
                  value={form.categoryId}
                  onChange={(e) => updateForm({ categoryId: e.target.value })}
                  style={{
                    width: '100%', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)',
                    padding: '9px 10px', borderRadius: 8, fontSize: 13.5,
                  }}
                >
                  <option value="">Choisir une catégorie…</option>
                  {flatOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                  <option value="__new__">+ Nouvelle catégorie principale…</option>
                </select>
                {form.categoryId === '__new__' && (
                  <input
                    style={{ marginTop: 8 }}
                    value={form.newCategory}
                    onChange={(e) => updateForm({ newCategory: e.target.value })}
                    placeholder="Nom de la nouvelle catégorie"
                  />
                )}
                <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 6 }}>
                  Pour créer une sous-catégorie, utilise l'onglet « Catégories » — elle apparaîtra ensuite ici.
                </p>
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
              </div><div className="field" style={{ borderTop: '1px dashed var(--line)', paddingTop: 14, marginTop: 4 }}>
                <label style={{ marginBottom: 8 }}>Traductions (optionnel — pour les clients anglais/allemands)</label>
                <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: -4, marginBottom: 8 }}>
                  Laisse vide pour garder le français par défaut dans cette langue.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input value={form.nameEn} onChange={(e) => updateForm({ nameEn: e.target.value })} placeholder="Nom (anglais)" />
                  <input value={form.nameDe} onChange={(e) => updateForm({ nameDe: e.target.value })} placeholder="Name (allemand)" />
                  <input value={form.descriptionEn} onChange={(e) => updateForm({ descriptionEn: e.target.value })} placeholder="Description (anglais)" />
                  <input value={form.descriptionDe} onChange={(e) => updateForm({ descriptionDe: e.target.value })} placeholder="Beschreibung (allemand)" />
                </div>
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
        )}

        {activeTab === 'categories' && (
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces, serif', margin: '0 0 4px' }}>Organisation des catégories</h3>
          <p style={{ color: 'var(--ink-dim)', fontSize: 12.5, marginBottom: 14 }}>
            L'ordre choisi ici est celui qui s'affiche côté client. Ajoute des sous-catégories imbriquées avec « + Sous-catégorie », renomme pour fusionner un doublon.
          </p>

          <CategoryTree
            parentId={null}
            byParent={byParent}
            dishCountByCat={dishCountByCat}
            depth={0}
            translateTitles={settings.translate_titles}
            onSaveTranslation={setCategoryTranslation}
            translateOpenId={translateOpenId}
            setTranslateOpenId={setTranslateOpenId}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
            renamingId={renamingId}
            renameValue={renameValue}
            setRenamingId={setRenamingId}
            setRenameValue={setRenameValue}
            onRename={renameCategory}
            onMove={moveCategory}
            onDelete={deleteCategoryNode}
            addingChildFor={addingChildFor}
            setAddingChildFor={setAddingChildFor}
            newChildName={newChildName}
            setNewChildName={setNewChildName}
            onAddChild={addCategory}
          />

          {(byParent['root'] || []).length === 0 && (
            <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
              Les catégories apparaîtront ici dès que tu auras ajouté un plat.
            </p>
          )}

          {addingChildFor === 'root' ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input
                autoFocus
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="Nom de la nouvelle catégorie principale"
                style={{ flex: 1 }}
              />
              <button className="btn" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => addCategory(null, newChildName)}>OK</button>
              <button className="btn ghost" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setAddingChildFor(null)}>Annuler</button>
            </div>
          ) : (
            <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => { setAddingChildFor('root'); setNewChildName(''); }}>
              + Nouvelle catégorie principale
            </button>
          )}
        </div>
        )}

{activeTab === 'announcements' && (
        <div className="card">
          {announcements.length === 0 && !annFormOpen && (
            <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, marginBottom: 14 }}>
              Aucune annonce pour l'instant. Utilise-les pour signaler une offre du jour, une soirée spéciale, une fermeture exceptionnelle…
            </p>
          )}

          {announcements.map((a, i) => (
            <div key={a.id} style={{ padding: '12px 4px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  <div style={{ color: 'var(--ink-dim)', fontSize: 12.5, marginTop: 2 }}>{a.message}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  <button
                    onClick={() => toggleAnnouncementActive(a)}
                    className="btn ghost"
                    style={{
                      fontSize: 11, padding: '6px 10px', borderRadius: 999,
                      color: a.active ? 'var(--herb)' : 'var(--ink-dim)',
                      borderColor: a.active ? 'rgba(76,107,65,0.35)' : 'var(--line)',
                    }}
                  >
                    {a.active ? 'Visible' : 'Masquée'}
                  </button>
                  <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => moveAnnouncement(i, -1)} disabled={i === 0} style={{ border: 'none', background: 'var(--paper)', color: 'var(--ink-dim)', padding: '6px 9px', fontSize: 12, cursor: 'pointer' }}>▲</button>
                    <button onClick={() => moveAnnouncement(i, 1)} disabled={i === announcements.length - 1} style={{ border: 'none', borderLeft: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink-dim)', padding: '6px 9px', fontSize: 12, cursor: 'pointer' }}>▼</button>
                  </div>
                  <button onClick={() => startEditAnnouncement(a)} className="btn ghost" style={{ padding: '6px 9px', fontSize: 13 }} title="Modifier">✎</button>
                  <button onClick={() => deleteAnnouncement(a)} style={{ background: 'none', border: 'none', color: 'var(--ink-dim)', cursor: 'pointer', fontSize: 15, padding: '6px 6px' }} title="Supprimer">✕</button>
                </div>
              </div>
            </div>
          ))}

          {!annFormOpen && (
            <button className="btn ghost" style={{ width: '100%', marginTop: 12 }} onClick={startAddAnnouncement}>
              + Nouvelle annonce
            </button>
          )}

          {annFormOpen && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
              <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, margin: '0 0 10px' }}>
                {annEditingId ? "Modifier l'annonce" : 'Nouvelle annonce'}
              </h4>
              <div className="field">
                <label>Titre</label>
                <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Ex. Soirée tapas ce vendredi 🎉" />
              </div>
              <div className="field">
                <label>Message</label>
                <input value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} placeholder="Ex. Dès 19h, formule spéciale à 25€. Réservation conseillée." />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} onClick={saveAnnouncement}>
                  {annEditingId ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button className="btn ghost" onClick={cancelAnnouncementForm}>Annuler</button>
              </div>
            </div>
          )}
        </div>
        )}
{activeTab === 'settings' && (
        <div className="card">
          <div className="settings-section">
            <div className="settings-section-head">
              <div className="settings-section-icon">🎨</div>
              <div className="settings-section-title">Apparence</div>
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Couleur de la carte</div>
                <div className="toggle-desc">Change la couleur d'accent vue par tes clients sur /menu (et ici).</div>
              </div>
              <input
                type="color"
                value={settings.accent_color || '#7C2D2D'}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{ width: 44, height: 32, border: '1px solid var(--line)', borderRadius: 8, padding: 2, background: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
              />
            </div>
            <div className="toggle-row" style={{ borderBottom: 'none' }}>
              <div>
                <div className="toggle-label">Couleur de fond</div>
                <div className="toggle-desc">Change la couleur d'arrière-plan de la carte.</div>
              </div>
              <input
                type="color"
                value={settings.background_color || '#FAF3E6'}
                onChange={(e) => setBackgroundColor(e.target.value)}
                style={{ width: 44, height: 32, border: '1px solid var(--line)', borderRadius: 8, padding: 2, background: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
              />
            </div>
          </div>

          <div className="settings-section" style={{ borderTop: '1px solid var(--line)', paddingTop: 22 }}>
            <div className="settings-section-head">
              <div className="settings-section-icon">✨</div>
              <div className="settings-section-title">Fonctionnalités</div>
            </div>
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
            <div className="toggle-row" style={{ borderBottom: 'none' }}>
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

          <div className="settings-section" style={{ borderTop: '1px solid var(--line)', paddingTop: 22 }}>
            <div className="settings-section-head">
              <div className="settings-section-icon">🌍</div>
              <div className="settings-section-title">Langues</div>
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Traduire aussi les titres</div>
                <div className="toggle-desc">Si activé, les noms des plats et des catégories se traduisent aussi (sinon seulement descriptions/allergènes/textes fixes).</div>
              </div>
              <button
                className={`toggle-btn ${settings.translate_titles ? 'on' : ''}`}
                onClick={() => toggleSetting('translate_titles')}
              >
                {settings.translate_titles ? 'Activé' : 'Désactivé'}
              </button>
            </div>
            <div className="toggle-row" style={{ borderBottom: 'none' }}>
              <div>
                <div className="toggle-label">Traduction automatique</div>
                <div className="toggle-desc">Remplit automatiquement les traductions manquantes (plats et catégories) via un service gratuit. Reclique après avoir ajouté de nouveaux plats.</div>
              </div>
              <button
                className="btn ghost"
                disabled={autoTranslating}
                onClick={autoTranslateAll}
                style={{ marginLeft: 12, whiteSpace: 'nowrap' }}
              >
                {autoTranslating ? 'Traduction…' : 'Traduire automatiquement'}
              </button>
            </div>
          </div>

          <div className="settings-section" style={{ borderTop: '1px solid var(--line)', paddingTop: 22 }}>
            <div className="settings-section-head">
              <div className="settings-section-icon">🔗</div>
              <div className="settings-section-title">Réseaux & contact</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: -6, marginBottom: 12 }}>
              Laisse vide ce que tu ne veux pas afficher. Une petite barre apparaîtra côté client uniquement pour les liens renseignés.
            </p>
            <div className="field">
              <label>Facebook</label>
              <input
                defaultValue={settings.social_facebook || ''}
                onBlur={(e) => setSocialField('social_facebook', e.target.value.trim())}
                placeholder="https://facebook.com/tonrestaurant"
              />
            </div>
            <div className="field">
              <label>Instagram</label>
              <input
                defaultValue={settings.social_instagram || ''}
                onBlur={(e) => setSocialField('social_instagram', e.target.value.trim())}
                placeholder="https://instagram.com/tonrestaurant"
              />
            </div>
            <div className="field">
              <label>Email de contact</label>
              <input
                defaultValue={settings.social_email || ''}
                onBlur={(e) => setSocialField('social_email', e.target.value.trim())}
                placeholder="contact@tonrestaurant.fr"
              />
            </div>
            <div className="field">
              <label>Site web</label>
              <input
                defaultValue={settings.social_website || ''}
                onBlur={(e) => setSocialField('social_website', e.target.value.trim())}
                placeholder="https://tonrestaurant.fr"
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Téléphone</label>
              <input
                defaultValue={settings.social_phone || ''}
                onBlur={(e) => setSocialField('social_phone', e.target.value.trim())}
                placeholder="0123456789"
              />
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function CategoryTree(props) {
  const {
    parentId, byParent, dishCountByCat, depth,
    renamingId, renameValue, setRenamingId, setRenameValue,
    onRename, onMove, onDelete,
    addingChildFor, setAddingChildFor, newChildName, setNewChildName, onAddChild,
    translateTitles, onSaveTranslation, translateOpenId, setTranslateOpenId,     menuOpenId, setMenuOpenId,
  } = props;
  const key = parentId || 'root';
  const nodes = byParent[key] || [];

  return (
    <div>
      {nodes.map((node, i) => (
        <div key={node.id} style={{ marginLeft: depth * 18 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 4px', borderBottom: '1px solid var(--line)',
            }}
          >
            {renamingId === node.id ? (
              <>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => onRename(node, renameValue)}>OK</button>
                <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setRenamingId(null)}>Annuler</button>
              </>
          ) : (
              <>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14, minWidth: 0 }}>
                  {node.name} <span style={{ color: 'var(--ink-dim)', fontWeight: 400, fontSize: 12 }}>({dishCountByCat[node.id] || 0})</span>
                </div>
<div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => onMove(node, -1)} disabled={i === 0} style={{ border: 'none', background: 'var(--paper)', color: 'var(--ink-dim)', padding: '6px 9px', fontSize: 12, cursor: 'pointer' }}>▲</button>
                    <button onClick={() => onMove(node, 1)} disabled={i === nodes.length - 1} style={{ border: 'none', borderLeft: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink-dim)', padding: '6px 9px', fontSize: 12, cursor: 'pointer' }}>▼</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === node.id ? null : node.id)}
                      className="btn ghost"
                      style={{ padding: '6px 11px', fontSize: 16, lineHeight: 1 }}
                    >
                      ⋯
                    </button>
                    {menuOpenId === node.id && (
                      <div className="cat-menu">
                        {translateTitles && (
                          <button
                            onClick={() => { setTranslateOpenId(translateOpenId === node.id ? null : node.id); setMenuOpenId(null); }}
                          >
                            🌐 Traductions
                          </button>
                        )}
                        <button
                          onClick={() => { setAddingChildFor(node.id); setNewChildName(''); setMenuOpenId(null); }}
                        >
                          ➕ Ajouter une sous-catégorie
                        </button>
                        <button
                          onClick={() => { setRenamingId(node.id); setRenameValue(node.name); setMenuOpenId(null); }}
                        >
                          ✎ Renommer
                        </button>
                        <button
                          className="danger"
                          onClick={() => { onDelete(node); setMenuOpenId(null); }}
                        >
                          ✕ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {translateTitles && translateOpenId === node.id && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4, marginBottom: 8, marginLeft: 18 }}>
              <input
                defaultValue={node.name_en || ''}
                onBlur={(e) => onSaveTranslation(node.id, 'name_en', e.target.value)}
                placeholder={`${node.name} (anglais)`}
                style={{ fontSize: 12.5 }}
              />
              <input
                defaultValue={node.name_de || ''}
                onBlur={(e) => onSaveTranslation(node.id, 'name_de', e.target.value)}
                placeholder={`${node.name} (allemand)`}
                style={{ fontSize: 12.5 }}
              />
            </div>
          )}

          {addingChildFor === node.id && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 8, marginLeft: 18 }}>
              <input
                autoFocus
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder={`Nom de la sous-catégorie de « ${node.name} »`}
                style={{ flex: 1 }}
              />
              <button className="btn" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => onAddChild(node.id, newChildName)}>OK</button>
              <button className="btn ghost" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setAddingChildFor(null)}>Annuler</button>
            </div>
          )}

          <CategoryTree
            {...props}
            parentId={node.id}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}
