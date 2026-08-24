import { NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/session-manager';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow Puppeteer some time

export async function GET() {
  try {
    const { sessionId, page } = await createSession();

    // Extract the captcha image as Base64 for educationboardresults.gov.bd
    // Target the specific image which usually has 'captcha' in the source
    const captchaSelector = 'img[src*="captcha"]';
    await page.waitForSelector(captchaSelector, { timeout: 10000 });
    
    const captchaElement = await page.$(captchaSelector);
    if (!captchaElement) {
      throw new Error('Captcha element not found on page');
    }

    const screenshotBuffer = await captchaElement.screenshot({ encoding: 'base64' });

    return NextResponse.json({
      sessionId,
      captchaBase64: screenshotBuffer
    });
  } catch (error: any) {
    console.error('Init session error:', error);
    return NextResponse.json({ error: 'Failed to initialize browser session' }, { status: 500 });
  }
}
