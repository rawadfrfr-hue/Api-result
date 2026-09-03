/**
 * Standalone Express server for Result API
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serves index.html

// 1x1 transparent PNG base64
const dummyCaptchaBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// Endpoint 1: Init Session
app.get('/api/init-session', async (req, res) => {
  try {
    const sessionId = uuidv4();
    res.json({ sessionId, captchaBase64: dummyCaptchaBase64 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to init session' });
  }
});

// Endpoint 2: Refresh Captcha
app.get('/api/refresh-captcha', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  
  try {
    res.json({ captchaBase64: dummyCaptchaBase64 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// Endpoint 3: Get Result
app.post('/api/get-result', async (req, res) => {
  const { board, exam, year, roll, reg } = req.body;
  
  try {
    const apiUrl = `https://api.bangladeshgov.org/?exam=${exam}&year=${year}&board=${board}&roll=${roll}&reg=${reg}`;
    
    // Use dynamic import for fetch since it's a built-in Node 18+ global but could be polyfilled
    const response = await fetch(apiUrl, {
      headers: {
        'Origin': 'https://eboardresultsapp.com',
        'Referer': 'https://eboardresultsapp.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    if (!response.ok) {
        return res.status(502).json({ success: false, error: 'Failed to fetch data from the provider' });
    }

    let resultData;
    try {
        resultData = await response.json();
    } catch(e) {
        return res.status(502).json({ success: false, error: 'Invalid response from provider' });
    }
    
    if (resultData.status === 'error' || resultData.error) {
         return res.json({ success: false, error: resultData.message || resultData.error || 'Validation Failed' });
    }

    // Attempt to map flexibly
    const data = resultData.data || resultData;
    
    const extractedData = {
      roll: data.roll || roll || '',
      reg: data.reg || data.registration || reg || '',
      name: data.name || data.student_name || '',
      father: data.father || data.father_name || '',
      mother: data.mother || data.mother_name || '',
      board: data.board || board || '',
      gpa: data.gpa || data.result || ''
    };

    res.json({ success: true, result: extractedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Submission failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Standalone Express server running on port ${PORT}`));
