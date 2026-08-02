export const UI_STRINGS = {
  fr: {
    menuTitle: 'La carte',
    subheading: "Un coup d'œil avant de commander : touchez un plat pour voir la photo en grand — ou ajoutez-le directement à votre commande.",
    loading: 'Chargement de la carte…',
    empty: "La carte n'a pas encore été mise à jour.",
    back: '‹ Retour à la carte',
    addToOrder: '+ Ajouter à ma commande',
    allergensLabel: 'Allergènes',
    noPhoto: 'Pas encore de photo',
    myOrder: 'Ma commande',
    emptyCart: "Aucun plat sélectionné pour l'instant.",
    total: 'Total',
    showServer: 'Montrez cet écran à votre serveur pour passer commande.',
    dishesSelected: (n) => `${n} plat${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`,
  },
  en: {
    menuTitle: 'Menu',
    subheading: "A quick look before you order: tap a dish to see the full photo — or add it straight to your order.",
    loading: 'Loading the menu…',
    empty: 'The menu has not been updated yet.',
    back: '‹ Back to menu',
    addToOrder: '+ Add to my order',
    allergensLabel: 'Allergens',
    noPhoto: 'No photo yet',
    myOrder: 'My order',
    emptyCart: 'No dish selected yet.',
    total: 'Total',
    showServer: 'Show this screen to your server to place your order.',
    dishesSelected: (n) => `${n} dish${n > 1 ? 'es' : ''} selected`,
  },
  de: {
    menuTitle: 'Speisekarte',
    subheading: 'Ein Blick vor der Bestellung: Tippen Sie auf ein Gericht, um das Foto in voller Größe zu sehen — oder fügen Sie es direkt Ihrer Bestellung hinzu.',
    loading: 'Speisekarte wird geladen…',
    empty: 'Die Speisekarte wurde noch nicht aktualisiert.',
    back: '‹ Zurück zur Karte',
    addToOrder: '+ Zur Bestellung hinzufügen',
    allergensLabel: 'Allergene',
    noPhoto: 'Noch kein Foto',
    myOrder: 'Meine Bestellung',
    emptyCart: 'Noch kein Gericht ausgewählt.',
    total: 'Summe',
    showServer: 'Zeigen Sie diesen Bildschirm Ihrem Kellner, um zu bestellen.',
    dishesSelected: (n) => `${n} Gericht${n > 1 ? 'e' : ''} ausgewählt`,
  },
};

export const ALLERGEN_TRANSLATIONS = {
  Gluten: { en: 'Gluten', de: 'Gluten' },
  Crustacés: { en: 'Crustaceans', de: 'Krebstiere' },
  Œufs: { en: 'Eggs', de: 'Eier' },
  Poissons: { en: 'Fish', de: 'Fisch' },
  Arachides: { en: 'Peanuts', de: 'Erdnüsse' },
  Soja: { en: 'Soy', de: 'Soja' },
  Lait: { en: 'Milk', de: 'Milch' },
  'Fruits à coque': { en: 'Tree nuts', de: 'Schalenfrüchte' },
  Céleri: { en: 'Celery', de: 'Sellerie' },
  Moutarde: { en: 'Mustard', de: 'Senf' },
  Sésame: { en: 'Sesame', de: 'Sesam' },
  Sulfites: { en: 'Sulphites', de: 'Sulfite' },
  Lupin: { en: 'Lupin', de: 'Lupine' },
  Mollusques: { en: 'Molluscs', de: 'Weichtiere' },
};

export const RECO_LABEL_TRANSLATIONS = {
  Suggestion: { en: 'Suggestion', de: 'Vorschlag' },
  'Boisson conseillée': { en: 'Recommended drink', de: 'Empfohlenes Getränk' },
  'Plat conseillé': { en: 'Recommended dish', de: 'Empfohlenes Gericht' },
  'Dessert conseillé': { en: 'Recommended dessert', de: 'Empfohlenes Dessert' },
  'Accord parfait': { en: 'Perfect pairing', de: 'Perfekte Kombination' },
};

export function translateRecoLabel(label, lang) {
  if (!label || lang === 'fr') return label;
  return RECO_LABEL_TRANSLATIONS[label]?.[lang] || label;
}

export function t(lang, key, ...args) {
  const dict = UI_STRINGS[lang] || UI_STRINGS.fr;
  const val = dict[key] ?? UI_STRINGS.fr[key];
  return typeof val === 'function' ? val(...args) : val;
}

export function translateAllergens(raw, lang) {
  if (!raw) return raw;
  if (lang === 'fr') return raw;
  return raw
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => ALLERGEN_TRANSLATIONS[a]?.[lang] || a)
    .join(', ');
}

export function announcementTitle(a, lang) {
  if (lang === 'en' && a.title_en) return a.title_en;
  if (lang === 'de' && a.title_de) return a.title_de;
  return a.title;
}

export function announcementMessage(a, lang) {
  if (lang === 'en' && a.message_en) return a.message_en;
  if (lang === 'de' && a.message_de) return a.message_de;
  return a.message;
}

export function dishName(dish, lang, translateTitles) {
  if (!translateTitles) return dish.name;
  if (lang === 'en' && dish.name_en) return dish.name_en;
  if (lang === 'de' && dish.name_de) return dish.name_de;
  if (dish.translations?.[lang]?.name) return dish.translations[lang].name;
  return dish.name;
}

export function categoryName(node, lang, translateTitles) {
  if (!translateTitles) return node.name;
  if (lang === 'en' && node.name_en) return node.name_en;
  if (lang === 'de' && node.name_de) return node.name_de;
  return node.name;
}

export function dishDescription(dish, lang) {
  if (lang === 'en' && dish.description_en) return dish.description_en;
  if (lang === 'de' && dish.description_de) return dish.description_de;
  if (dish.translations?.[lang]?.description) return dish.translations[lang].description;
  return dish.description;
}
