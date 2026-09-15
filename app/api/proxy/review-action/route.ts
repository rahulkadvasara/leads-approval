import { NextResponse } from 'next/server';

const TARGET_URL = 'https://ai-automation-stage.oomnieye.com/webhook-test/review-action';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.hint || `n8n POST webhook returned HTTP ${res.status}`,
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: data.message || 'Action executed successfully on n8n.',
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in proxy POST review-action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Network error posting to n8n webhook.',
      },
      { status: 500 }
    );
  }
}
