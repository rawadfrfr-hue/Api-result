import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, board, exam, year, roll, reg, captcha } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const apiUrl = `https://api.bangladeshgov.org/?exam=${exam}&year=${year}&board=${board}&roll=${roll}&reg=${reg}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
        return NextResponse.json({ success: false, error: 'Failed to fetch data from the provider' }, { status: 502 });
    }

    let resultData;
    try {
        resultData = await response.json();
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Invalid response from provider' }, { status: 502 });
    }

    if (resultData.status === 'error' || resultData.error) {
         return NextResponse.json({ success: false, error: resultData.message || resultData.error || 'Validation Failed' });
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

    return NextResponse.json({
      success: true,
      result: extractedData
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
