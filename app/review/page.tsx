'use client';

import { useEffect, useState } from 'react';
import { ReviewPayload, SourceUrl } from '@/lib/types';

export default function ReviewPage() {
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveReview();
  }, []);

  const fetchActiveReview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/reviews', { cache: 'no-store' });
      const data = await res.json();

      if (data.success && data.review) {
        setReview(data.review);
      } else {
        setReview(null);
      }
    } catch (err) {
      console.error('Failed to load review:', err);
      setError('Failed to load the active review. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const sendDecision = async (decision: 'accepted' | 'rejected') => {
    if (!review) return;

    setValidationError(null);
    setError(null);

    // Validate feedback for rejection
    if (decision === 'rejected' && !feedback.trim()) {
      setValidationError('Please provide feedback before rejecting.');
      return;
    }

    setSubmitting(true);

    const payload = {
      decision,
      feedback: decision === 'accepted' ? '' : feedback.trim(),
    };

    try {
      let success = false;
      try {
        const n8nRes = await fetch(review.resume_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (n8nRes.ok) {
          success = true;
        } else {
          console.warn(`Direct n8n POST returned status ${n8nRes.status}. Retrying via proxy endpoint...`);
        }
      } catch (directErr) {
        console.warn('Direct POST to n8n resume_url failed (likely CORS or network). Retrying via API route...', directErr);
      }

      // If direct fetch didn't succeed, fallback to server proxy route /api/reviews/submit
      if (!success) {
        const proxyRes = await fetch('/api/reviews/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resume_url: review.resume_url,
            decision: payload.decision,
            feedback: payload.feedback,
          }),
        });

        const proxyData = await proxyRes.json();
        if (!proxyRes.ok || !proxyData.success) {
          throw new Error(proxyData.error || 'Failed to submit decision to n8n resume URL.');
        }
      }

      // Clear review from server-side memory
      await fetch('/api/reviews', { method: 'DELETE' });

      // Clear local state and set submission message
      const successMsg =
        decision === 'accepted'
          ? 'Review accepted. The workflow will continue.'
          : 'Review rejected. The workflow will reconsider the lead using your feedback.';

      setSubmittedMessage(successMsg);
      setReview(null);
      setFeedback('');
    } catch (err) {
      console.error('Submission error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while submitting your decision.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getConfidenceBadge = (confidence?: string) => {
    const level = (confidence || '').toLowerCase();
    if (level === 'high') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50/90 text-emerald-800 border border-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          High Confidence
        </span>
      );
    } else if (level === 'medium') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50/90 text-amber-800 border border-amber-200/90 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
          Medium Confidence
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50/90 text-rose-800 border border-rose-200/90 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
          {confidence ? `${confidence} Confidence` : 'Low Confidence'}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100/90 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
        <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3"></div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4 border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error && !review) {
    return (
      <main className="min-h-screen bg-slate-100/90 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 rounded-xl p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-bold text-rose-700 dark:text-rose-400 mb-2">Error</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{error}</p>
            <button
              onClick={fetchActiveReview}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="min-h-screen bg-slate-100/90 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Display notification banner if review was just submitted */}
          {submittedMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/90 dark:border-emerald-800/80 rounded-xl p-4 text-emerald-800 dark:text-emerald-200 flex items-start gap-3 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] text-xs sm:text-sm">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-semibold">{submittedMessage}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">The review has been removed from server memory.</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-8 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No review available.</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              There is currently no active lead pending human review. Send a payload from n8n to <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">POST /api/reviews</code> to begin.
            </p>
            <button
              onClick={() => {
                setSubmittedMessage(null);
                fetchActiveReview();
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
            >
              Check for Review
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isTender = review.review_type?.toLowerCase() === 'tender';
  const reviewTypeTitle = isTender ? 'Tender Review' : 'Owner Review';
  const enrichmentSectionTitle = isTender ? 'Tender Enrichment' : 'Owner Enrichment';

  const enrichmentData: Record<string, any> = review.data || review.owner || {};
  const sourceUrls: SourceUrl[] = enrichmentData.source_urls || (review.owner?.source_urls ?? []);

  return (
    <main className="min-h-screen bg-slate-100/90 dark:bg-slate-950 py-9 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Header & Integrated Compact Metadata Bar */}
        <header className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_1px_2px_-1px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{reviewTypeTitle}</h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Human-in-the-Loop enrichment approval system
              </p>
            </div>
            <div>
              {getConfidenceBadge(review.confidence)}
            </div>
          </div>

          {/* Styled Compact Metadata Row */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-lg p-3 px-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200/60 dark:divide-slate-700/60">
            <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:pr-3">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">PROJECT</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{review.project_name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:px-3 pt-2 sm:pt-0">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">REF #</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">{review.reference_number || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:pl-3 pt-2 sm:pt-0">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ATTEMPT</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{review.attempt}</span>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900/80 rounded-xl p-4 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] text-xs sm:text-sm">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Dynamic Enrichment Section (Owner vs Tender) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_1px_2px_-1px_rgba(15,23,42,0.03)] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
            {enrichmentSectionTitle}
          </h2>
          {!isTender ? (
            /* Owner Review View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Owner
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {enrichmentData.owner_matched_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Official Website
                  </span>
                  {enrichmentData.official_website ? (
                    <a
                      href={enrichmentData.official_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline break-all transition-colors"
                    >
                      {enrichmentData.official_website}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-medium">N/A</span>
                  )}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Phone
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {enrichmentData.confirmed_phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Email
                  </span>
                  {enrichmentData.contact_email ? (
                    <a
                      href={`mailto:${enrichmentData.contact_email}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline break-all transition-colors"
                    >
                      {enrichmentData.contact_email}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-medium">N/A</span>
                  )}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Key Contact
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {enrichmentData.key_contact_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    LinkedIn
                  </span>
                  {enrichmentData.linkedin_url ? (
                    <a
                      href={enrichmentData.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline break-all transition-colors"
                    >
                      {enrichmentData.linkedin_url}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-medium">N/A</span>
                  )}
                </div>
              </div>

              {enrichmentData.recent_news_signal && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    Recent News / Activity
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 leading-relaxed font-normal">
                    {enrichmentData.recent_news_signal}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Tender Review View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {Object.entries(enrichmentData)
                .filter(([key]) => key !== 'source_urls')
                .map(([key, value]) => {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
                  const isEmail = typeof value === 'string' && value.includes('@') && !value.includes(' ');
                  const isLongText = typeof value === 'string' && value.length > 80;
                  const formattedVal =
                    typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value ?? 'N/A');

                  return (
                    <div key={key} className={isLongText ? 'sm:col-span-2' : ''}>
                      <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        {label}
                      </span>
                      {isUrl ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline break-all transition-colors"
                        >
                          {value}
                        </a>
                      ) : isEmail ? (
                        <a
                          href={`mailto:${value}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline break-all transition-colors"
                        >
                          {value}
                        </a>
                      ) : isLongText ? (
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 leading-relaxed font-normal">
                          {formattedVal}
                        </p>
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formattedVal}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* Verification & Sources (Stacked Layout) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_1px_2px_-1px_rgba(15,23,42,0.03)] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
            Verification & Sources
          </h2>

          <div>
            <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Confidence Reason
            </span>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 font-normal">
              {review.confidence_reason || 'No confidence reason specified.'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Source References
            </span>
            {sourceUrls && sourceUrls.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5">
                {sourceUrls.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs gap-2"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline break-all transition-colors"
                    >
                      {source.url}
                    </a>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold capitalize bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600 shrink-0">
                      {source.type || 'Source'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 p-2">No source URLs provided.</p>
            )}
          </div>
        </section>

        {/* Compact Your Decision Panel */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_1px_2px_-1px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Your Decision
            </h2>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              *Required if rejecting
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <textarea
                id="feedback-textarea"
                rows={3}
                disabled={submitting}
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Provide feedback for the AI agent..."
                className="w-full px-3.5 py-2.5 border border-slate-300/90 dark:border-slate-700 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50 text-xs sm:text-sm"
              />
              {validationError && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <span>⚠️</span> {validationError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => sendDecision('rejected')}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:ring-2 focus:ring-rose-500/30 text-white font-semibold rounded-lg text-xs sm:text-sm transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => sendDecision('accepted')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:ring-2 focus:ring-emerald-500/30 text-white font-semibold rounded-lg text-xs sm:text-sm transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Accept'}
              </button>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
