/**
 * Standalone Express server for Puppeteer Automation
 * Provided as requested for a generic Node.js backend.
 * NOTE: For the AI Studio Preview environment, we are using the Next.js API routes (in /app/api) 
 * which share the exact same logic. You can use this server.js file for your standalone deployments.
 */
const express = require('express');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serves index.html

// State Management
const sessions = new Map();

// Cleanup loop
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > 5 * 60 * 1000) {
      session.browser.close().catch(() => {});
      sessions.delete(id);
      console.log(`Cleaned up stale session: ${id}`);
    }
  }
}, 60000);

// Endpoint 1: Init Session
app.get('/api/init-session', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    const page = await browser.newPage();
    
    await page.goto('http://www.educationboardresults.gov.bd/', { waitUntil: 'networkidle2' });

    const captchaSelector = 'img[src*="captcha"]';
    await page.waitForSelector(captchaSelector, { timeout: 10000 });
    const captchaElement = await page.$(captchaSelector);
    const screenshotBuffer = await captchaElement.screenshot({ encoding: 'base64' });

    const sessionId = uuidv4();
    sessions.set(sessionId, { browser, page, lastActive: Date.now() });

    res.json({ sessionId, captchaBase64: screenshotBuffer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to init session' });
  }
});

// Endpoint 2: Refresh Captcha
app.get('/api/refresh-captcha', async (req, res) => {
  const { sessionId } = req.query;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  
  session.lastActive = Date.now();
  try {
    // For educationboardresults.gov.bd, reload the page
    await session.page.reload({ waitUntil: 'networkidle2' });
    
    const captchaSelector = 'img[src*="captcha"]';
    await session.page.waitForSelector(captchaSelector, { timeout: 10000 });
    const captchaElement = await session.page.$(captchaSelector);
    const screenshotBuffer = await captchaElement.screenshot({ encoding: 'base64' });
    
    res.json({ captchaBase64: screenshotBuffer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// Endpoint 3: Get Result
app.post('/api/get-result', async (req, res) => {
  const { sessionId, board, exam, year, roll, reg, captcha } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.lastActive = Date.now();
  const { page } = session;

  try {
    // Target selectors based on educationboardresults.gov.bd standard form names
    await page.type('select[name="board"]', board || '');
    await page.type('select[name="exam"]', exam || '');
    await page.type('select[name="year"]', year || '');
    await page.type('input[name="roll"]', roll || '');
    await page.type('input[name="reg"]', reg || '');
    await page.type('input[name="value"]', captcha || ''); // 'value' is often the name for captcha input there

    await page.click('input[type="submit"], button[type="submit"]');

    // Wait for EITHER the success table or an error message to mount
    const resultSelector = 'table';
    const errorSelector = '.alert, .error, font[color="red"]';
    
    try {
      await page.waitForFunction(
        (resSel, errSel) => document.querySelector(resSel) || document.querySelector(errSel),
        { timeout: 15000 }, resultSelector, errorSelector
      );
    } catch (e) {
      return res.status(504).json({ success: false, error: 'Target portal did not respond in time.' });
    }

    const hasError = await page.$(errorSelector);
    if (hasError) {
      const errorText = await page.$eval(errorSelector, el => el.textContent?.trim());
      return res.json({ success: false, error: errorText || 'Validation Failed' });
    }

    const extractedData = await page.evaluate(() => {
      // Basic extraction targeting typical table rows, customize as needed
      return {
        roll: document.querySelector('.res-roll')?.textContent?.trim() || '',
        reg: document.querySelector('.res-reg')?.textContent?.trim() || '',
        name: document.querySelector('.res-name')?.textContent?.trim() || '',
        father: document.querySelector('.res-father')?.textContent?.trim() || '',
        mother: document.querySelector('.res-mother')?.textContent?.trim() || '',
        board: document.querySelector('.res-board')?.textContent?.trim() || '',
        gpa: document.querySelector('.res-gpa')?.textContent?.trim() || ''
      };
    });
    
    await session.browser.close();
    sessions.delete(sessionId);
    
    res.json({ success: true, result: extractedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Submission failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Standalone Express server running on port ${PORT}`));
