import { ReviewPayload } from './types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  payload?: ReviewPayload;
}

export function validateReviewPayload(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Payload must be a JSON object.' };
  }

  const payload = data as Partial<ReviewPayload>;

  if (!payload.review_id || typeof payload.review_id !== 'string' || !payload.review_id.trim()) {
    return { isValid: false, error: 'Missing or invalid "review_id" field.' };
  }

  if (!payload.resume_url || typeof payload.resume_url !== 'string' || !payload.resume_url.trim()) {
    return { isValid: false, error: 'Missing or invalid "resume_url" field.' };
  }

  // Validate URL format for resume_url
  try {
    const parsedUrl = new URL(payload.resume_url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { isValid: false, error: '"resume_url" must use HTTP or HTTPS protocol.' };
    }
  } catch {
    return { isValid: false, error: '"resume_url" must be a valid HTTP or HTTPS URL.' };
  }

  if (payload.attempt === undefined || typeof payload.attempt !== 'number') {
    return { isValid: false, error: 'Missing or invalid "attempt" field (must be a number).' };
  }

  if (!payload.reference_number || typeof payload.reference_number !== 'string') {
    return { isValid: false, error: 'Missing or invalid "reference_number" field.' };
  }

  if (!payload.project_name || typeof payload.project_name !== 'string') {
    return { isValid: false, error: 'Missing or invalid "project_name" field.' };
  }

  const enrichmentData =
    typeof payload.data === 'string'
      ? (() => {
          try {
            return JSON.parse(payload.data);
          } catch {
            return null;
          }
        })()
      : (payload.data ?? payload.owner);

  if (!enrichmentData || typeof enrichmentData !== 'object') {
    return { isValid: false, error: 'Missing or invalid "data" or "owner" enrichment object.' };
  }

  if (!payload.confidence || typeof payload.confidence !== 'string') {
    return { isValid: false, error: 'Missing or invalid "confidence" field.' };
  }

  if (payload.confidence_reason === undefined || typeof payload.confidence_reason !== 'string') {
    return { isValid: false, error: 'Missing or invalid "confidence_reason" field.' };
  }

  const reviewType = payload.review_type && typeof payload.review_type === 'string'
    ? payload.review_type.trim().toLowerCase()
    : 'owner';

  return {
    isValid: true,
    payload: {
      review_id: payload.review_id.trim(),
      review_type: reviewType,
      attempt: payload.attempt,
      resume_url: payload.resume_url.trim(),
      reference_number: payload.reference_number.trim(),
      project_name: payload.project_name.trim(),
      owner: payload.owner,
      data: enrichmentData,
      confidence: payload.confidence.toLowerCase().trim(),
      confidence_reason: payload.confidence_reason.trim(),
    },
  };
}
