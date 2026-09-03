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
    const commonHeaders = {
      'Origin': 'https://eboardresultsapp.com',
      'Referer': 'https://eboardresultsapp.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    };

    let response = null;
    let providerErrorDetail = '';

    // Attempt 1: api.bangladeshgov.org
    try {
      const apiUrl = `https://api.bangladeshgov.org/?exam=${encodeURIComponent(exam)}&year=${encodeURIComponent(year)}&board=${encodeURIComponent(board)}&roll=${encodeURIComponent(roll)}&reg=${encodeURIComponent(reg)}`;
      response = await fetch(apiUrl, {
        headers: commonHeaders
      });
    } catch (err) {
      providerErrorDetail = `api.bangladeshgov.org error: ${err.message}`;
    }

    // Attempt 2: result.bangladeshgov.org/result
    if (!response || !response.ok) {
      if (response) {
        const bodySnippet = await response.text().catch(() => '');
        providerErrorDetail = `api.bangladeshgov.org HTTP ${response.status}: ${bodySnippet.slice(0, 120)}`;
      }
      try {
        const postData = new URLSearchParams({
          exam: String(exam),
          year: String(year),
          board: String(board),
          result_type: '1',
          roll: String(roll),
          reg: String(reg)
        });

        const fallbackResponse = await fetch('https://result.bangladeshgov.org/result', {
          method: 'POST',
          headers: {
            ...commonHeaders,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: postData.toString()
        });

        if (fallbackResponse.ok) {
          response = fallbackResponse;
        } else {
          const fbBody = await fallbackResponse.text().catch(() => '');
          providerErrorDetail += ` | result.bangladeshgov.org HTTP ${fallbackResponse.status}: ${fbBody.slice(0, 120)}`;
        }
      } catch (err) {
        providerErrorDetail += ` | result.bangladeshgov.org error: ${err.message}`;
      }
    }

    if (!response || !response.ok) {
      return res.status(502).json({ 
        success: false, 
        error: `Provider Server Error: ${providerErrorDetail || 'Failed to fetch data from the provider'}` 
      });
    }

    let resultData;
    try {
      resultData = await response.json();
    } catch(e) {
      return res.status(502).json({ success: false, error: 'Invalid JSON response from provider' });
    }
    
    if (resultData.status === 'error' || resultData.status === 1 || resultData.error) {
      return res.json({ 
        success: false, 
        error: resultData.message || resultData.msg || resultData.error || 'Result not found or verification failed' 
      });
    }

    const data = resultData.res || resultData.data || resultData;
    
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
