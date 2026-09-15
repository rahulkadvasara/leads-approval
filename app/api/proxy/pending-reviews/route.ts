import { NextResponse } from 'next/server';

const TARGET_URL = 'https://ai-automation-stage.oomnieye.com/webhook-test/pending-reviews';

export async function GET() {
  try {
    const res = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
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
          error: data.message || data.hint || `n8n GET webhook returned HTTP ${res.status}`,
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in proxy GET pending-reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Network error connecting to n8n webhook.',
      },
      { status: 500 }
    );
  }
}
