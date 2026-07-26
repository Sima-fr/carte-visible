'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { resizeImage } from '../../lib/resizeImage';
import { formatPrice } from '../../lib/format';

export default function AdminPage() {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
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

  useEffect(() => {
    loadDishes();
    loadCategories();
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
