export async function translateText(text, target) {
  if (!text || !text.trim()) return '';
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target }),
    });
    const data = await res.json();
    return data.translated || '';
  } catch (e) {
    return '';
  }
}
