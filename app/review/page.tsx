'use client';

import { useEffect, useState } from 'react';
import { ReviewPayload } from '@/lib/types';

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
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800">
          High Confidence
        </span>
      );
    } else if (level === 'medium') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800">
          Medium Confidence
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border dark:border-rose-800">
          {confidence ? `${confidence} Confidence` : 'Low Confidence'}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
        <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
          <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 space-y-4 border border-slate-200 dark:border-slate-800">
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
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-rose-600 dark:text-rose-400 mb-2">Error</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">{error}</p>
            <button
              onClick={fetchActiveReview}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-sm font-medium transition"
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
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Display notification banner if review was just submitted */}
          {submittedMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 text-emerald-800 dark:text-emerald-200 flex items-start gap-3 shadow-sm">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-semibold text-sm">{submittedMessage}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">The review has been removed from server memory.</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No review available.</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              There is currently no active lead pending human review. Send a payload from n8n to <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">POST /api/reviews</code> to begin.
            </p>
            <button
              onClick={() => {
                setSubmittedMessage(null);
                fetchActiveReview();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              Check for Review
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { owner } = review;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Lead Review</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Human-in-the-Loop enrichment approval system
            </p>
          </div>
          <div>
            {getConfidenceBadge(review.confidence)}
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 rounded-lg p-4 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-sm">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Project Information */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            Project Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Project Name
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {review.project_name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Reference Number
              </span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                {review.reference_number || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Review Attempt
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {review.attempt}
              </span>
            </div>
          </div>
        </section>

        {/* Owner Enrichment */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            Owner Enrichment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Owner
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {owner?.owner_matched_name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Official Website
              </span>
              {owner?.official_website ? (
                <a
                  href={owner.official_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                >
                  {owner.official_website}
                </a>
              ) : (
                <span className="text-slate-400">N/A</span>
              )}
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Phone
              </span>
              <span className="text-slate-900 dark:text-slate-100">
                {owner?.confirmed_phone || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Email
              </span>
              {owner?.contact_email ? (
                <a
                  href={`mailto:${owner.contact_email}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                >
                  {owner.contact_email}
                </a>
              ) : (
                <span className="text-slate-400">N/A</span>
              )}
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Key Contact
              </span>
              <span className="text-slate-900 dark:text-slate-100">
                {owner?.key_contact_name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                LinkedIn
              </span>
              {owner?.linkedin_url ? (
                <a
                  href={owner.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                >
                  {owner.linkedin_url}
                </a>
              ) : (
                <span className="text-slate-400">N/A</span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Recent News / Activity
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
              {owner?.recent_news_signal || 'No recent activity recorded.'}
            </p>
          </div>
        </section>

        {/* Confidence */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Confidence
            </h2>
            {getConfidenceBadge(review.confidence)}
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Confidence Reason
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {review.confidence_reason || 'No confidence reason specified.'}
            </p>
          </div>
        </section>

        {/* Sources */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            Sources
          </h2>
          {owner?.source_urls && owner.source_urls.length > 0 ? (
            <div className="space-y-3">
              {owner.source_urls.map((source, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-sm gap-2"
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline break-all font-medium"
                  >
                    {source.url}
                  </a>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium capitalize bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                    {source.type || 'Source'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No source URLs provided.</p>
          )}
        </section>

        {/* Human Feedback */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            Human Feedback
          </h2>
          <div>
            <label htmlFor="feedback-textarea" className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Feedback for AI Agent (Required if rejecting)
            </label>
            <textarea
              id="feedback-textarea"
              rows={4}
              disabled={submitting}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Enter feedback for the AI agent..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900 text-sm"
            />
            {validationError && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 font-medium">
                {validationError}
              </p>
            )}
          </div>
        </section>

        {/* Actions */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-end gap-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => sendDecision('rejected')}
            className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? 'Submitting...' : 'Reject'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => sendDecision('accepted')}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? 'Submitting...' : 'Accept'}
          </button>
        </section>

      </div>
    </main>
  );
}
