import { NextResponse } from 'next/server';

const TARGET_URL =
  process.env.NEXT_PUBLIC_WF1_WEBHOOK_URL ||
  'https://ai-automation-stage.oomnieye.com/webhook/lead-enrichment';

export async function POST() {
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({}),
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
          error: data.message || data.error || `n8n WF-1 webhook returned HTTP ${res.status}`,
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: data.message || 'Lead enrichment completed successfully.',
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in proxy POST lead-enrichment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Network error posting to WF-1 webhook.',
      },
      { status: 500 }
    );
  }
}
