export async function translateText(text, target) {
  if (!text || !text.trim()) return '';
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target }),
    });
    const data = await res.json();
    const translated = data.translated || '';
    if (/query length limit|invalid source language|no translations|mymemory/i.test(translated)) {
      return '';
    }
    return translated;
  } catch (e) {
    return '';
  }
}
