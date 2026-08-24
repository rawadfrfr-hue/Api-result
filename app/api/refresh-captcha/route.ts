import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-manager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session expired or not found' }, { status: 404 });
    }

    const { page } = session;

    // For educationboardresults.gov.bd, there may not be a refresh button.
    // The most robust way to refresh the session is to reload the page.
    await page.reload({ waitUntil: 'networkidle2' });
    
    // Wait for the captcha image to appear again
    const captchaSelector = 'img[src*="captcha"]';
    await page.waitForSelector(captchaSelector, { timeout: 10000 });
    const captchaElement = await page.$(captchaSelector);
    if (!captchaElement) {
      throw new Error('Captcha element not found after refresh');
    }

    const screenshotBuffer = await captchaElement.screenshot({ encoding: 'base64' });

    return NextResponse.json({
      captchaBase64: screenshotBuffer
    });
  } catch (error: any) {
    console.error('Refresh captcha error:', error);
    return NextResponse.json({ error: 'Failed to refresh captcha' }, { status: 500 });
  }
}
