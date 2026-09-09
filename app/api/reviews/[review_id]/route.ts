import { NextResponse } from 'next/server';
import { getActiveReview } from '@/lib/store';

/**
 * GET /api/reviews/[review_id]
 * Fetch review by review_id.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ review_id: string }> }
) {
  try {
    const { review_id } = await params;
    const activeReview = getActiveReview();

    if (activeReview && activeReview.review_id === review_id) {
      return NextResponse.json(
        { success: true, review: activeReview },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, review: null, message: `Review with id '${review_id}' not found.` },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error handling GET /api/reviews/[review_id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
