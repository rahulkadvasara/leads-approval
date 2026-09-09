import { NextResponse } from 'next/server';
import { getActiveReview, setActiveReview, clearActiveReview } from '@/lib/store';
import { validateReviewPayload } from '@/lib/validation';

/**
 * POST /api/reviews
 * Endpoint for n8n HTTP Request node to send a lead review payload.
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body in request.' },
        { status: 400 }
      );
    }

    const validation = validateReviewPayload(body);
    if (!validation.isValid || !validation.payload) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Payload validation failed.' },
        { status: 400 }
      );
    }

    // Store review temporarily in server-side memory
    setActiveReview(validation.payload);

    return NextResponse.json(
      {
        success: true,
        review_id: validation.payload.review_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling POST /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while processing review payload.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews
 * Endpoint for frontend to fetch the currently active lead review.
 */
export async function GET() {
  try {
    const activeReview = getActiveReview();

    if (!activeReview) {
      return NextResponse.json(
        { success: false, review: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        review: activeReview,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling GET /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while retrieving active review.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews
 * Endpoint to clear the currently active lead review from memory.
 */
export async function DELETE() {
  try {
    clearActiveReview();
    return NextResponse.json(
      { success: true, message: 'Active review cleared from memory.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling DELETE /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear active review.' },
      { status: 500 }
    );
  }
}
