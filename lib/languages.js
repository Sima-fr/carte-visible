export const LANGUAGE_CATALOG = [
  { code: 'en', label: 'Anglais', flag: '🇬🇧' },
  { code: 'de', label: 'Allemand', flag: '🇩🇪' },
  { code: 'es', label: 'Espagnol', flag: '🇪🇸' },
  { code: 'it', label: 'Italien', flag: '🇮🇹' },
  { code: 'pt', label: 'Portugais', flag: '🇵🇹' },
  { code: 'tr', label: 'Turc', flag: '🇹🇷' },
  { code: 'ru', label: 'Russe', flag: '🇷🇺' },
  { code: 'zh', label: 'Chinois', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabe', flag: '🇸🇦' },
  { code: 'ja', label: 'Japonais', flag: '🇯🇵' },
];

export const FLAG_FR = '🇫🇷';

export function flagFor(code) {
  if (code === 'fr') return FLAG_FR;
  return LANGUAGE_CATALOG.find((l) => l.code === code)?.flag || code.toUpperCase();
}
