import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { board, exam, year, roll, reg } = body;

    const commonHeaders = {
      'Origin': 'https://eboardresultsapp.com',
      'Referer': 'https://eboardresultsapp.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    };

    let response: Response | null = null;
    let providerErrorDetail = '';

    // Attempt 1: api.bangladeshgov.org
    try {
      const apiUrl = `https://api.bangladeshgov.org/?exam=${encodeURIComponent(exam)}&year=${encodeURIComponent(year)}&board=${encodeURIComponent(board)}&roll=${encodeURIComponent(roll)}&reg=${encodeURIComponent(reg)}`;
      response = await fetch(apiUrl, {
        headers: commonHeaders,
        cache: 'no-store'
      });
    } catch (err: any) {
      providerErrorDetail = `api.bangladeshgov.org error: ${err.message}`;
    }

    // Attempt 2: If attempt 1 failed or returned non-200, try result.bangladeshgov.org/result
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
          body: postData.toString(),
          cache: 'no-store'
        });

        if (fallbackResponse.ok) {
          response = fallbackResponse;
        } else {
          const fbBody = await fallbackResponse.text().catch(() => '');
          providerErrorDetail += ` | result.bangladeshgov.org HTTP ${fallbackResponse.status}: ${fbBody.slice(0, 120)}`;
        }
      } catch (err: any) {
        providerErrorDetail += ` | result.bangladeshgov.org error: ${err.message}`;
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Provider Server Error: ${providerErrorDetail || 'Failed to fetch data from the provider'}` 
      }, { status: 502 });
    }

    let resultData;
    try {
      resultData = await response.json();
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid JSON response from provider' }, { status: 502 });
    }

    if (resultData.status === 'error' || resultData.status === 1 || resultData.error) {
      return NextResponse.json({ 
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

    return NextResponse.json({
      success: true,
      result: extractedData
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
