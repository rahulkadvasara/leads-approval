'use client';

import { useState, useMemo, useEffect } from 'react';
import { DecisionAction, EditableFields, ReviewItem } from '@/lib/types';
import {
  extractEditableFields,
  buildUpdatedDataPayload,
  getProjectDetailsSection,
  getOwnerDetailsSection,
  getContractorDetailsSection,
  getOtherFieldsSection,
  extractSourceUrls,
  getRawValue,
  formatDisplayValue,
  EDITABLE_FIELD_KEYS,
} from '@/lib/mapping';
import { submitReviewAction } from '@/lib/api';

interface ProjectDetailModalProps {
  project: ReviewItem;
  isOpen: boolean;
  onClose: () => void;
  onActionSuccess: (referenceNumber: string, actionType: DecisionAction, message?: string) => void;
}

export default function ProjectDetailModal({
  project,
  isOpen,
  onClose,
  onActionSuccess,
}: ProjectDetailModalProps) {
  const referenceNumber = useMemo(
    () => String(getRawValue(project, 'reference_number', 'Reference Number', 'ref_num') || 'N/A'),
    [project]
  );

  const projectName = useMemo(
    () => String(getRawValue(project, 'project_name', 'Project Name', 'name') || 'Unnamed Project'),
    [project]
  );

  // Initial editable fields extracted from project
  const initialEditable = useMemo(() => extractEditableFields(project), [project]);
  const [currentEditable, setCurrentEditable] = useState<EditableFields>(initialEditable);

  // Re-sync initial values when project changes
  useEffect(() => {
    setCurrentEditable(extractEditableFields(project));
    setError(null);
    setPromptAction(null);
    setFeedbackInput('');
  }, [project]);

  // Compute change tracking
  const hasChanges = useMemo(() => {
    return EDITABLE_FIELD_KEYS.some(
      (key) => (currentEditable[key] || '').trim() !== (initialEditable[key] || '').trim()
    );
  }, [currentEditable, initialEditable]);

  // Submission & Sub-dialog state
  const [submitting, setSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<DecisionAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prompt dialog for Reject or Discard
  const [promptAction, setPromptAction] = useState<'reject' | 'discard' | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');

  if (!isOpen) return null;

  const handleFieldChange = (key: keyof EditableFields, value: string) => {
    setCurrentEditable((prev) => ({ ...prev, [key]: value }));
  };

  // Direct action handlers (Accept & Update)
  const handleExecuteAction = async (decision: DecisionAction, feedbackText = '') => {
    setSubmitting(true);
    setSubmittingAction(decision);
    setError(null);

    let updatedDataPayload: Record<string, any> = {};
    if (decision === 'updated') {
      updatedDataPayload = buildUpdatedDataPayload(initialEditable, currentEditable);
    }

    const payload = {
      reference_number: referenceNumber,
      decision,
      feedback: feedbackText,
      updated_data: updatedDataPayload,
    };

    const res = await submitReviewAction(payload);

    if (res.success) {
      onActionSuccess(referenceNumber, decision, res.message);
      onClose();
    } else {
      setError(res.error || `Failed to perform ${decision} action.`);
    }

    setSubmitting(false);
    setSubmittingAction(null);
    setPromptAction(null);
  };

  // Section data extraction
  const projectDetails = getProjectDetailsSection(project);
  const ownerDetails = getOwnerDetailsSection(project);
  const contractorDetails = getContractorDetailsSection(project);
  const otherFields = getOtherFieldsSection(project);

  const ownerSourceUrls = extractSourceUrls(project, 'source_urls');
  const contractorSourceUrls = extractSourceUrls(project, 'contractor_source_urls');

  const confidenceBadge = formatDisplayValue(
    getRawValue(project, 'enrichment_confidence', 'Enrichment Confidence', 'confidence', 'Math Confidence Tier')
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="space-y-0.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border dark:border-indigo-800">
                {referenceNumber}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Confidence: <strong className="text-slate-900 dark:text-slate-100">{confidenceBadge}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {projectName}
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-sm">
          {/* Error Banner inside modal */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-rose-800 dark:text-rose-200 flex items-start gap-3 text-xs sm:text-sm">
              <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold">Action Failed</p>
                <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            </div>
          )}

          {/* Section A: Project Details */}
          <section className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              A. Project Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {projectDetails.map((f) => (
                <div key={f.key} className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {f.label}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 break-words">
                    {f.formatted}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section B: Owner Details */}
          <section className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                B. Owner Details & Enrichment
              </h3>
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                ✎ Blue outline fields are editable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Editable: Owner Matched Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Owner Matched Name *
                </label>
                <input
                  type="text"
                  disabled={submitting}
                  value={currentEditable.owner_matched_name}
                  onChange={(e) => handleFieldChange('owner_matched_name', e.target.value)}
                  placeholder="Owner name..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Official Website */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Official Website *
                </label>
                <input
                  type="url"
                  disabled={submitting}
                  value={currentEditable.official_website}
                  onChange={(e) => handleFieldChange('official_website', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Confirmed Phone */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Confirmed Phone *
                </label>
                <input
                  type="text"
                  disabled={submitting}
                  value={currentEditable.confirmed_phone}
                  onChange={(e) => handleFieldChange('confirmed_phone', e.target.value)}
                  placeholder="+1..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Contact Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Contact Email *
                </label>
                <input
                  type="email"
                  disabled={submitting}
                  value={currentEditable.contact_email}
                  onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Key Contact Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Key Contact Name *
                </label>
                <input
                  type="text"
                  disabled={submitting}
                  value={currentEditable.key_contact_name}
                  onChange={(e) => handleFieldChange('key_contact_name', e.target.value)}
                  placeholder="Contact person..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: LinkedIn URL */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  LinkedIn URL *
                </label>
                <input
                  type="url"
                  disabled={submitting}
                  value={currentEditable.linkedin_url}
                  onChange={(e) => handleFieldChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Readonly Owner Fields */}
            <div className="space-y-3 pt-2">
              {ownerDetails.map((f) => (
                <div key={f.key} className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {f.label}
                  </span>
                  <p className="text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 leading-relaxed">
                    {f.formatted}
                  </p>
                </div>
              ))}

              {/* Source URLs */}
              {ownerSourceUrls.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Owner Source URLs
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ownerSourceUrls.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-md text-xs font-medium hover:underline break-all"
                      >
                        🔗 {s.label || s.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section C: Contractor / Tender Details */}
          <section className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                C. Contractor / Tender Details & Enrichment
              </h3>
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                ✎ Blue outline fields are editable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Editable: Contractor Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Contractor Name *
                </label>
                <input
                  type="text"
                  disabled={submitting}
                  value={currentEditable.contractor_name}
                  onChange={(e) => handleFieldChange('contractor_name', e.target.value)}
                  placeholder="Contractor company..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Contractor Type */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Contractor Type *
                </label>
                <input
                  type="text"
                  disabled={submitting}
                  value={currentEditable.contractor_type}
                  onChange={(e) => handleFieldChange('contractor_type', e.target.value)}
                  placeholder="Main Contractor, Infra, EPC..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Contractor Website */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Contractor Website *
                </label>
                <input
                  type="url"
                  disabled={submitting}
                  value={currentEditable.contractor_website}
                  onChange={(e) => handleFieldChange('contractor_website', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Contractor Contact Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Contractor Contact Name *
                </label>
                <input
                  type="text"
                  disabled={submitting}
                  value={currentEditable.contractor_contact_name}
                  onChange={(e) => handleFieldChange('contractor_contact_name', e.target.value)}
                  placeholder="Key contact..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Editable: Contractor Contact Email */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Contractor Contact Email *
                </label>
                <input
                  type="email"
                  disabled={submitting}
                  value={currentEditable.contractor_contact_email}
                  onChange={(e) => handleFieldChange('contractor_contact_email', e.target.value)}
                  placeholder="contractor@domain.com"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-medium dark:text-slate-100 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Readonly Contractor Fields */}
            <div className="space-y-3 pt-2">
              {contractorDetails.map((f) => (
                <div key={f.key} className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {f.label}
                  </span>
                  <p className="text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 leading-relaxed">
                    {f.formatted}
                  </p>
                </div>
              ))}

              {contractorSourceUrls.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Contractor Source URLs
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {contractorSourceUrls.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-md text-xs font-medium hover:underline break-all"
                      >
                        🔗 {s.label || s.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section D: Other Dynamic Fields (If any) */}
          {otherFields.length > 0 && (
            <section className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
                D. Additional Fields
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherFields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {f.label}
                    </span>
                    {f.isUrl ? (
                      <a
                        href={f.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-xs break-all block"
                      >
                        {f.formatted}
                      </a>
                    ) : f.isEmail ? (
                      <a
                        href={`mailto:${f.value}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-xs break-all block"
                      >
                        {f.formatted}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-slate-100 break-words block text-xs">
                        {f.formatted}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer / Action Toolbar */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Unsaved changes pending
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto flex-wrap">
            {/* Update Button (Disabled unless modified) */}
            <button
              type="button"
              disabled={!hasChanges || submitting}
              onClick={() => handleExecuteAction('updated')}
              title={hasChanges ? 'Submit edited values' : 'Edit at least one field to enable Update'}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg text-xs transition shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {submitting && submittingAction === 'updated' ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </button>

            {/* Discard Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setFeedbackInput('');
                setPromptAction('discard');
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              Discard
            </button>

            {/* Reject Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setFeedbackInput('');
                setPromptAction('reject');
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold rounded-lg text-xs transition shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              Reject
            </button>

            {/* Accept Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleExecuteAction('accepted')}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && submittingAction === 'accepted' ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Accepting...
                </>
              ) : (
                'Accept'
              )}
            </button>
          </div>
        </div>

        {/* Sub-Dialog / Prompt Overlay for Reject or Discard */}
        {promptAction && (
          <div className="absolute inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {promptAction === 'reject' ? (
                  <>
                    <span className="text-rose-500">🚫</span> Reject Project
                  </>
                ) : (
                  <>
                    <span className="text-amber-500">🗑️</span> Discard Project
                  </>
                )}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {promptAction === 'reject'
                  ? 'Please enter a reason for rejecting this project (Required).'
                  : 'You may optionally provide a reason for discarding this project.'}
              </p>

              <div>
                <textarea
                  rows={3}
                  disabled={submitting}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder={
                    promptAction === 'reject'
                      ? 'Type rejection feedback here...'
                      : 'Type discard feedback (optional)...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setPromptAction(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    submitting || (promptAction === 'reject' && !feedbackInput.trim())
                  }
                  onClick={() =>
                    handleExecuteAction(
                      promptAction === 'reject' ? 'rejected' : 'discarded',
                      feedbackInput.trim()
                    )
                  }
                  className={`px-4 py-2 text-white font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                    promptAction === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : promptAction === 'reject' ? 'Confirm Reject' : 'Confirm Discard'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
