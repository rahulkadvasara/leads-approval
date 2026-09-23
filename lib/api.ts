import { PendingReviewsResponse, ReviewActionPayload, ReviewActionResponse } from './types';

const N8N_GET_URL = 'https://ai-automation-stage.oomnieye.com/webhook/pending-reviews';
const N8N_POST_URL = 'https://ai-automation-stage.oomnieye.com/webhook/review-action';

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
 * Helper to check whether an object is an actual review record (and not an empty placeholder like `{}`)
 */
function isValidReviewRecord(item: any): boolean {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (Object.keys(item).length === 0) return false;

  const hasValue = (val: any) =>
    val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim().toUpperCase() !== 'N/A';

  const refNum = item['reference_number'] ?? item['Reference Number'] ?? item['ref_num'];
  const projName = item['project_name'] ?? item['Project Name'] ?? item['name'];
  const owner = item['owner_matched_name'] ?? item['Owner Matched Name'] ?? item['Owners'] ?? item['Owner'];
  const contractor = item['contractor_name'] ?? item['Contractor Name'] ?? item['Contractor'];
  const slNo = item['Sl No'] ?? item['sl_no'] ?? item['row_number'];
  const needsRev = item['Needs Review'] ?? item['needs_review'];

  return (
    hasValue(refNum) ||
    hasValue(projName) ||
    hasValue(owner) ||
    hasValue(contractor) ||
    hasValue(slNo) ||
    hasValue(needsRev)
  );
}

/**
 * Normalizes n8n GET webhook response data
 */
function parsePendingReviewsData(data: any): PendingReviewsResponse {
  if (data === null || data === undefined) {
    return { success: true, count: 0, reviews: [] };
  }

  // Case 1: Array returned directly [...]
  if (Array.isArray(data)) {
    const validReviews = data.filter(isValidReviewRecord);
    return {
      success: true,
      count: validReviews.length,
      reviews: validReviews,
    };
  }

  // Case 2: Object response
  if (typeof data === 'object') {
    // Explicit error response without reviews
    if (data.error && typeof data.error === 'string' && data.success === false && !data.reviews) {
      return {
        success: false,
        count: 0,
        reviews: [],
        error: data.error || data.message || 'Error fetching pending reviews.',
      };
    }

    // Standard response format { success: true, count: X, reviews: [...] }
    if (Array.isArray(data.reviews)) {
      const validReviews = data.reviews.filter(isValidReviewRecord);
      return {
        success: data.success ?? true,
        count: validReviews.length,
        reviews: validReviews,
      };
    }

    if (data.count === 0) {
      return { success: true, count: 0, reviews: [] };
    }

    // Single review object returned inside `reviews` property
    if (data.reviews && typeof data.reviews === 'object' && !Array.isArray(data.reviews)) {
      if (isValidReviewRecord(data.reviews)) {
        return { success: data.success ?? true, count: 1, reviews: [data.reviews] };
      }
      return { success: data.success ?? true, count: 0, reviews: [] };
    }

    // Check if `data` itself is a single valid review item
    if (isValidReviewRecord(data)) {
      return {
        success: data.success ?? true,
        count: 1,
        reviews: [data],
      };
    }

    // Empty or non-review status object (or `{}` inside response)
    return {
      success: data.success ?? true,
      count: 0,
      reviews: [],
    };
  }

  return {
    success: true,
    count: 0,
    reviews: [],
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
