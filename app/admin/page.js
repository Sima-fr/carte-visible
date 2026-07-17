'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
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

  useEffect(() => {
    loadDishes();
  }, []);

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
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(path, file);
      if (uploadError) {
        alert("Erreur lors de l'envoi de la photo : " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(path);
      photo_url = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from('dishes').insert({
      name: name.trim(),
      price: price.trim(),
      photo_url,
      available: true,
    });

    if (error) {
      alert("Erreur lors de l'ajout du plat : " + error.message);
    } else {
      setName('');
      setPrice('');
      setFile(null);
      setPreview(null);
      setFormOpen(false);
      loadDishes();
    }
    setSaving(false);
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

          {dishes.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 4px', borderBottom: '1px solid var(--line)',
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
                <div style={{ color: 'var(--ink-dim)', fontSize: 12.5 }}>{d.price}</div>
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
          ))}

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
                <label>Prix</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex. 14 €" />
              </div>
              <button className="btn" style={{ width: '100%' }} disabled={saving} onClick={addDish}>
                {saving ? 'Ajout en cours…' : 'Ajouter à la carte'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
