import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Visible dummy PNG base64 with text "12345"
    const screenshotBuffer = "iVBORw0KGgoAAAANSUhEUgAAAJYAAAAyBAMAAABMoj8pAAAAG1BMVEX09PQAAADV1dW3t7ceHh6YmJh6eno9PT1bW1uwamqiAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAB4klEQVRIie2VS1PCMBDHY2ihR4NYeowI47UUdTxaRL1SHUaP7fgYj4TxcaUwfG/zatqA0nDj0P9hs9mkv93JqwBUqlRpb4Vl25sEynvIhyG3Ha4y1Pkxb2opQmimvDs1HvJcIWKKt6NsJFjkLoCXyKde+h2AHpnKcQdx1v2ECf+JUEq+BGvJTLdJzQvz6p4cj0Rd3saHm2q49nGhSFe5RDTwPuEsF5QKhuMiC4zyerHINeQONGD1b4DGIsqLBCvxBas46R89YZ2Vrnk1VxRYM2DReRrrM3OgWGxrKllH5SywxmpnTncoqsOCZe/OUv5VG2d9wWpejUbLnVjWNbPOT+j5vH8yl6x6q/3+Ec52YUVjwfpsiRrY8nGW41Frt7A5C6rl6pE5q+YIqIPGU83NWVYzj7J97Mc6q3FoziJ+Hk58en+AzirdzZzlFE8HXXZnuMYqPbE5K40L4YMpiFbsnUnfJlm55ixHu7+UlSCpLIc5Kx1rrDmA/F1OAvU015tguzJWQ08aZeQEq5g4yuUsSLSy5DOvs6LYjNW9kX24YPZMVclZNjetEpRkQbSSfwcYfgWd5/yXw1mW99i5IIb3sSa3jG6/TWi7UOOcBV9p7LYM9ZcGA7wROx0EmxMrVaq0P/oFu7BJHKWaIK8AAAAASUVORK5CYII=";

    return NextResponse.json({
      captchaBase64: screenshotBuffer
    });
  } catch (error: any) {
    console.error('Refresh captcha error:', error);
    return NextResponse.json({ error: 'Failed to refresh captcha' }, { status: 500 });
  }
}
