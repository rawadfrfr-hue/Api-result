/**
 * Standalone Express server for Result API
 */
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serves index.html

const SUBJECT_MAP = {
  '101': 'BANGLA',
  '102': 'BANGLA-II',
  '107': 'ENGLISH',
  '108': 'ENGLISH-II',
  '109': 'MATHEMATICS',
  '127': 'SCIENCE',
  '110': 'GEOGRAPHY & ENVIRONMENT',
  '111': 'ISLAM & MORAL EDUCATION',
  '112': 'HINDU RELIGION & MORAL EDUCATION',
  '113': 'BUDDHIST RELIGION',
  '114': 'CHRISTIAN RELIGION',
  '136': 'HIGHER MATHEMATICS',
  '137': 'CHEMISTRY',
  '138': 'BIOLOGY',
  '140': 'CIVICS & CITIZENSHIP',
  '147': 'PHYSICAL EDUCATION, HEALTH & SPORTS',
  '150': 'AGRICULTURE STUDIES',
  '151': 'HOME SCIENCE',
  '153': 'HISTORY OF BANGLADESH & WORLD CIVILIZATION',
  '154': 'INFORMATION & COMMUNICATION TECHNOLOGY',
  '156': 'CAREER EDUCATION',
};

function parseSubjectDetails(displayDetails) {
  if (!displayDetails) return [];
  const subjects = [];
  const parts = displayDetails.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const code = trimmed.slice(0, colonIdx).trim();
    const resultPart = trimmed.slice(colonIdx + 1).trim();
    const equalIdx = resultPart.lastIndexOf('=');
    const grade = equalIdx !== -1 ? resultPart.slice(equalIdx + 1).trim() : resultPart;
    const name = SUBJECT_MAP[code] || `Subject ${code}`;

    subjects.push({ code, name, grade });
  }

  return subjects;
}

// Endpoint: Captcha
app.get('/api/captcha', async (req, res) => {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const cRes = await fetch(`https://eboardresults.com/v2/captcha?t=${Date.now()}`, {
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://eboardresults.com/v2/home',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (cRes.ok) {
      const setCookie = cRes.headers.get('set-cookie') || '';
      let session = '';
      const match = setCookie.match(/EBRSESSID2=([^;]+)/);
      if (match) {
        session = match[1];
      } else {
        session = setCookie.split(';')[0];
      }

      const buffer = await cRes.arrayBuffer();
      if (buffer && buffer.byteLength > 100 && session) {
        const base64 = Buffer.from(buffer).toString('base64');
        return res.json({
          success: true,
          image: `data:image/jpeg;base64,${base64}`,
          session,
          source: 'eboardresults',
        });
      }
    }
  } catch (err) {
    console.warn('eboardresults captcha failed in express:', err);
  }

  // Fallback
  try {
    const fbRes = await fetch('https://webbasedresult.bd/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': userAgent },
      body: 'action=bdrc_captcha',
    });
    if (fbRes.ok) {
      const data = await fbRes.json();
      if (data.success && data.data && data.data.image) {
        return res.json({
          success: true,
          image: data.data.image,
          session: data.data.session || '',
          source: 'webbasedresult',
        });
      }
    }
  } catch (err) {
    console.error('Fallback failed:', err);
  }

  res.status(500).json({ success: false, error: 'Failed to load captcha.' });
});

// Endpoint: Get Result
app.post('/api/get-result', async (req, res) => {
  const { board, exam, year, roll, reg, captcha, session, source } = req.body;

  if (!roll || !board || !exam || !year) {
    return res.status(400).json({ success: false, error: 'Missing required parameters.' });
  }

  if (!captcha) {
    return res.status(400).json({ success: false, error: 'Please enter the 4-digit Security Key.' });
  }

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  let normalizedBoard = String(board).toLowerCase();
  if (normalizedBoard === 'technical') normalizedBoard = 'tec';
  if (normalizedBoard === 'rajashai') normalizedBoard = 'rajshahi';

  try {
    const postData = new URLSearchParams();
    postData.append('exam', String(exam).toLowerCase());
    postData.append('year', String(year));
    postData.append('board', normalizedBoard);
    postData.append('result_type', '1');
    postData.append('roll', String(roll).trim());
    postData.append('reg', String(reg || '').trim());
    postData.append('captcha', String(captcha).trim());

    const cookieHeader = session ? `EBRSESSID2=${session}` : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const rRes = await fetch('https://eboardresults.com/v2/getres', {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://eboardresults.com/v2/home',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
      },
      body: postData.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!rRes.ok) {
      return res.status(502).json({ success: false, error: 'Education Board server temporarily busy.' });
    }

    const data = await rRes.json();

    if (data.status !== 0) {
      const errorMsg = data.msg || data.message || 'Could not validate security key.';
      return res.json({
        success: false,
        error: errorMsg,
        isCaptchaError: errorMsg.toLowerCase().includes('captcha') || errorMsg.toLowerCase().includes('security key'),
      });
    }

    const resultObj = data.res || {};
    const subjects = parseSubjectDetails(resultObj.display_details);

    return res.json({
      success: true,
      result: {
        roll: resultObj.roll_no || roll,
        reg: resultObj.regno || reg || '',
        name: resultObj.name || '',
        father: resultObj.fname || '',
        mother: resultObj.mname || '',
        board: resultObj.board_name || board,
        session: resultObj.session || '',
        group: resultObj.stud_group || '',
        dob: resultObj.dob || '',
        institute: resultObj.inst_name || resultObj.eiin || '',
        gpa: resultObj.res_detail === 'P' ? (resultObj.gpa || 'PASSED') : (resultObj.res_detail || resultObj.gpa || ''),
        subjects,
      },
    });
  } catch (err) {
    console.error('Express get-result error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve result.' });
  }
});

const PORT = 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
