import { NextResponse } from 'next/server';
import { clearActiveReview } from '@/lib/store';

/**
 * POST /api/reviews/submit
 * Server-side relay endpoint to post human decision to n8n resume_url.
 * Automatically clears active review from memory upon successful submission.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resume_url, decision, feedback } = body;

    if (!resume_url || typeof resume_url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid resume_url.' },
        { status: 400 }
      );
    }

    if (decision !== 'accepted' && decision !== 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Decision must be "accepted" or "rejected".' },
        { status: 400 }
      );
    }

    // Validate URL protocol
    try {
      const parsedUrl = new URL(resume_url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { success: false, error: 'resume_url must be HTTP or HTTPS.' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid resume_url.' },
        { status: 400 }
      );
    }

    // Forward request from server to n8n resume_url
    const response = await fetch(resume_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision,
        feedback: feedback || '',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { success: false, error: `n8n responded with status ${response.status}: ${text}` },
        { status: response.status }
      );
    }

    // Clear active review from server memory after successful submission
    clearActiveReview();

    return NextResponse.json(
      { success: true, message: 'Decision submitted successfully to n8n and active review cleared.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting decision to n8n resume_url:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to reach n8n resume URL.' },
      { status: 500 }
    );
  }
}
