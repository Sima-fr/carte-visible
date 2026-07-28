export async function POST(req) {
  try {
    const { text, target } = await req.json();
    if (!text || !text.trim()) {
      return Response.json({ translated: '' });
    }
    const langpair = `fr|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const r = await fetch(url);
    const data = await r.json();
    const translated = data?.responseData?.translatedText || '';
    return Response.json({ translated });
  } catch (e) {
    return Response.json({ translated: '', error: String(e) }, { status: 500 });
  }
}
