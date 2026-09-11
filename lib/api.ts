import { PendingReviewsResponse, ReviewActionPayload, ReviewActionResponse } from './types';

const N8N_GET_URL = 'https://ai-automation-stage.oomnieye.com/webhook-test/pending-reviews';
const N8N_POST_URL = 'https://ai-automation-stage.oomnieye.com/webhook-test/review-action';

/**
 * Fetch pending reviews from n8n GET webhook (with proxy fallback)
 */
export async function fetchPendingReviews(): Promise<PendingReviewsResponse> {
  // Attempt 1: Direct browser fetch to n8n webhook
  try {
    const res = await fetch(N8N_GET_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return parsePendingReviewsData(data);
    }
  } catch (directErr) {
    console.warn('Direct fetch to n8n GET webhook failed (CORS or network). Retrying via proxy...', directErr);
  }

  // Attempt 2: Server-side proxy route `/api/proxy/pending-reviews`
  try {
    const proxyRes = await fetch('/api/proxy/pending-reviews', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const proxyData = await proxyRes.json();
    if (!proxyRes.ok) {
      throw new Error(proxyData.error || `Proxy returned status ${proxyRes.status}`);
    }
    return parsePendingReviewsData(proxyData);
  } catch (proxyErr) {
    console.error('Failed to fetch pending reviews via proxy:', proxyErr);
    return {
      success: false,
      count: 0,
      reviews: [],
      error: proxyErr instanceof Error ? proxyErr.message : 'Unable to connect to pending-reviews webhook.',
    };
  }
}

/**
 * Normalizes n8n GET webhook response data
 */
function parsePendingReviewsData(data: any): PendingReviewsResponse {
  if (!data) {
    return { success: false, count: 0, reviews: [], error: 'Received empty response from server.' };
  }

  // Case 1: Standard response format { success: true, count: 2, reviews: [...] }
  if (Array.isArray(data.reviews)) {
    return {
      success: data.success ?? true,
      count: typeof data.count === 'number' ? data.count : data.reviews.length,
      reviews: data.reviews,
    };
  }

  // Case 2: Array returned directly [...]
  if (Array.isArray(data)) {
    return {
      success: true,
      count: data.length,
      reviews: data,
    };
  }

  // Case 3: Single review object returned
  if (typeof data === 'object' && !data.error) {
    if (data.reviews && typeof data.reviews === 'object') {
      const arr = Array.isArray(data.reviews) ? data.reviews : [data.reviews];
      return { success: true, count: arr.length, reviews: arr };
    }
    // If it has reference_number or project_name or similar fields
    return {
      success: true,
      count: 1,
      reviews: [data],
    };
  }

  return {
    success: false,
    count: 0,
    reviews: [],
    error: data.message || data.error || 'Invalid pending reviews payload structure.',
  };
}

/**
 * Submit review action POST to n8n webhook (with proxy fallback)
 */
export async function submitReviewAction(payload: ReviewActionPayload): Promise<ReviewActionResponse> {
  const requestBody = JSON.stringify({
    reference_number: payload.reference_number,
    decision: payload.decision,
    feedback: payload.feedback || '',
    updated_data: payload.updated_data || {},
  });

  // Attempt 1: Direct browser fetch to n8n webhook
  try {
    const res = await fetch(N8N_POST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
    });

    if (res.ok) {
      let responseText = '';
      try {
        const data = await res.json();
        return {
          success: data.success ?? true,
          message: data.message || 'Action submitted successfully.',
        };
      } catch {
        responseText = await res.text();
        return {
          success: true,
          message: responseText || 'Action accepted by server.',
        };
      }
    }
  } catch (directErr) {
    console.warn('Direct POST to n8n webhook failed. Retrying via proxy...', directErr);
  }

  // Attempt 2: Server-side proxy route `/api/proxy/review-action`
  try {
    const proxyRes = await fetch('/api/proxy/review-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
    });

    const proxyData = await proxyRes.json();
    if (!proxyRes.ok || !proxyData.success) {
      throw new Error(proxyData.error || `Action failed with status ${proxyRes.status}`);
    }

    return {
      success: true,
      message: proxyData.message || 'Action processed successfully.',
    };
  } catch (proxyErr) {
    console.error('Error submitting review action:', proxyErr);
    return {
      success: false,
      error: proxyErr instanceof Error ? proxyErr.message : 'Network error submitting review action to n8n webhook.',
    };
  }
}
