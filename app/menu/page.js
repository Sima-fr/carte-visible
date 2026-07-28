'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function MenuPage() {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Chargement de la carte...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>Coup d'Œil</h1>
      </header>

      <main style={{ maxWidth: '448px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {categories.map((cat) => {
          const categoryDishes = dishes.filter((d) => d.category_id === cat.id);
          if (categoryDishes.length === 0) return null;

          return (
            <section key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #f59e0b', paddingBottom: '4px', color: '#1f2937' }}>
                {cat.name}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {categoryDishes.map((dish) => (
                  <div key={dish.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', display: 'flex', gap: '12px', border: '1px solid #f3f4f6' }}>
                    {dish.image_url && (
                      <img
                        src={dish.image_url}
                        alt={dish.name}
                        style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontWeight: '600', color: '#111827' }}>{dish.name}</h3>
                        {dish.description && (
                          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            {dish.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>
                          {dish.price} €
                        </span>
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
