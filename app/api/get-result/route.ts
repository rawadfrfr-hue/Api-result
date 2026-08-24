import { NextRequest, NextResponse } from 'next/server';
import { getSession, closeSession } from '@/lib/session-manager';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, board, exam, year, roll, reg, captcha } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session expired or not found' }, { status: 404 });
    }

    const { page } = session;

    // Target selectors based on educationboardresults.gov.bd standard form names
    await page.type('select[name="board"]', board || '');
    await page.type('select[name="exam"]', exam || '');
    await page.type('select[name="year"]', year || '');
    await page.type('input[name="roll"]', roll || '');
    await page.type('input[name="reg"]', reg || '');
    await page.type('input[name="value"]', captcha || ''); // 'value' is often the name for captcha input there

    // Submit the form
    await page.click('input[type="submit"], button[type="submit"]');

    // Wait for either the result table or an error message to appear
    const resultSelector = 'table'; // Their result page is usually a big table
    const errorSelector = '.alert, .error, font[color="red"]'; // Common error selectors in old PHP sites
    
    try {
      await page.waitForFunction(
        (resSel, errSel) => document.querySelector(resSel) || document.querySelector(errSel),
        { timeout: 15000 },
        resultSelector,
        errorSelector
      );
    } catch (e) {
      // Timeout
      return NextResponse.json({ success: false, error: 'Target portal did not respond in time.' }, { status: 504 });
    }

    const hasError = await page.$(errorSelector);
    if (hasError) {
      const errorText = await page.$eval(errorSelector, el => el.textContent?.trim());
      
      // Cleanup the session on failure so they get a fresh one, or we could keep it alive.
      // But typically a failure on these portals reloads the page.
      // We will keep it alive and let the client hit refresh-captcha.
      
      return NextResponse.json({ success: false, error: errorText || 'Validation Failed' });
    }

    // Success! Extract the result data
    const extractedData = await page.evaluate(() => {
      // NOTE: Customize this extraction logic based on the actual HTML structure of the result page
      const roll = document.querySelector('.res-roll')?.textContent?.trim() || '';
      const reg = document.querySelector('.res-reg')?.textContent?.trim() || '';
      const name = document.querySelector('.res-name')?.textContent?.trim() || '';
      const father = document.querySelector('.res-father')?.textContent?.trim() || '';
      const mother = document.querySelector('.res-mother')?.textContent?.trim() || '';
      const board = document.querySelector('.res-board')?.textContent?.trim() || '';
      const gpa = document.querySelector('.res-gpa')?.textContent?.trim() || '';
      
      return { roll, reg, name, father, mother, board, gpa };
    });

    // Close the browser session to free resources
    await closeSession(sessionId);

    return NextResponse.json({
      success: true,
      result: extractedData
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
