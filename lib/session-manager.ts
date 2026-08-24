import puppeteer, { Browser, Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { mockPortalHtml } from './mock-portal';

interface Session {
  browser: Browser;
  page: Page;
  lastActive: number;
}

const sessions = new Map<string, Session>();

// Cleanup loop for stale sessions (runs every minute)
if (typeof global !== 'undefined') {
  if (!(global as any)._sessionCleanupInterval) {
    (global as any)._sessionCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of sessions.entries()) {
        if (now - session.lastActive > 5 * 60 * 1000) { // 5 mins timeout
          session.browser.close().catch(() => {});
          sessions.delete(id);
          console.log(`Cleaned up stale session: ${id}`);
        }
      }
    }, 60000);
  }
}

export async function createSession() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });
  const page = await browser.newPage();
  
  await page.goto('http://www.educationboardresults.gov.bd/', { waitUntil: 'networkidle2' });
  
  const sessionId = uuidv4();
  sessions.set(sessionId, { browser, page, lastActive: Date.now() });
  
  return { sessionId, page };
}

export function getSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActive = Date.now();
    return session;
  }
  return null;
}

export async function closeSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) {
    await session.browser.close().catch(() => {});
    sessions.delete(sessionId);
  }
}
