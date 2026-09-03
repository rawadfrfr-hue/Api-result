import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Attempt 1: Direct eboardresults.com official captcha
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://eboardresults.com/v2/captcha?t=${Date.now()}`, {
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://eboardresults.com/v2/home',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const setCookie = res.headers.get('set-cookie') || '';
      let session = '';
      const match = setCookie.match(/EBRSESSID2=([^;]+)/);
      if (match) {
        session = match[1];
      } else {
        session = setCookie.split(';')[0];
      }

      const buffer = await res.arrayBuffer();
      if (buffer && buffer.byteLength > 100 && session) {
        const base64 = Buffer.from(buffer).toString('base64');
        return NextResponse.json({
          success: true,
          image: `data:image/jpeg;base64,${base64}`,
          session,
          source: 'eboardresults',
        });
      }
    }
  } catch (err) {
    console.warn('eboardresults captcha fetch failed or timed out, trying fallback...', err);
  }

  // Attempt 2: Fallback to webbasedresult.bd
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const fbRes = await fetch('https://webbasedresult.bd/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: 'action=bdrc_captcha',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (fbRes.ok) {
      const data = await fbRes.json();
      if (data.success && data.data && data.data.image) {
        return NextResponse.json({
          success: true,
          image: data.data.image,
          session: data.data.session || '',
          source: 'webbasedresult',
        });
      }
    }
  } catch (err) {
    console.error('Fallback captcha fetch failed:', err);
  }

  return NextResponse.json(
    { success: false, error: 'Could not load Security Key. Please reload or check your connection.' },
    { status: 500 }
  );
}
