import { ReviewPayload } from './types';

// Declare global variable to maintain memory store across Hot Module Reloads in Next.js development mode
declare global {
  // eslint-disable-next-line no-var
  var __activeReviewStore: ReviewPayload | null | undefined;
}

/**
 * TEMPORARY IN-MEMORY STORAGE (V1 Prototype)
 * 
 * Stores the currently active lead review received from the n8n HTTP Request node.
 * Note: For production use, replace this in-memory store with a persistent database
 * such as PostgreSQL, Supabase, or Redis.
 */
export function getActiveReview(): ReviewPayload | null {
  return globalThis.__activeReviewStore ?? null;
}

export function setActiveReview(review: ReviewPayload): void {
  globalThis.__activeReviewStore = review;
}

export function clearActiveReview(): void {
  globalThis.__activeReviewStore = null;
}
