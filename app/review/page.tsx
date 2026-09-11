'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { DecisionAction, ReviewItem } from '@/lib/types';
import { fetchPendingReviews } from '@/lib/api';
import { getRawValue, getTableRowSummary } from '@/lib/mapping';
import ProjectDetailModal from '@/components/ProjectDetailModal';

export default function ReviewPage() {
  const [projects, setProjects] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected project for detailed modal
  const [selectedProject, setSelectedProject] = useState<ReviewItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info';
  } | null>(null);

  const loadReviews = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const res = await fetchPendingReviews();

    if (res.success) {
      setProjects(res.reviews || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } else {
      setError(res.error || 'Failed to fetch pending reviews from n8n.');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadReviews(false);
  }, [loadReviews]);

  // Toast auto-clear
  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open modal handler
  const handleOpenProject = (project: ReviewItem) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // Callback when an action succeeds in modal
  const handleActionSuccess = (
    referenceNumber: string,
    actionType: DecisionAction,
    message?: string
  ) => {
    // Optimistically remove project from state immediately
    setProjects((prev) =>
      prev.filter((item) => {
        const ref = String(getRawValue(item, 'reference_number', 'Reference Number', 'ref_num') || '');
        return ref !== referenceNumber;
      })
    );

    const actionText =
      actionType === 'accepted'
        ? 'Accepted'
        : actionType === 'rejected'
        ? 'Rejected'
        : actionType === 'updated'
        ? 'Updated'
        : 'Discarded';

    showToast(message || `Project ${referenceNumber} ${actionText} successfully.`, 'success');
  };

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((item) => {
      const ref = String(getRawValue(item, 'reference_number', 'Reference Number') || '').toLowerCase();
      const name = String(getRawValue(item, 'project_name', 'Project Name') || '').toLowerCase();
      const owner = String(getRawValue(item, 'owner_matched_name', 'Owner Matched Name', 'Owners') || '').toLowerCase();
      const contractor = String(getRawValue(item, 'contractor_name', 'Contractor Name') || '').toLowerCase();
      return ref.includes(q) || name.includes(q) || owner.includes(q) || contractor.includes(q);
    });
  }, [projects, searchQuery]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-60 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 dark:border-slate-300 text-xs sm:text-sm font-medium">
            <span className="text-emerald-400 dark:text-emerald-600 text-base">✓</span>
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white dark:hover:text-slate-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold text-lg">
              LR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Lead & Project Review Dashboard
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:border dark:border-indigo-800">
                  {projects.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review and enrich construction projects awaiting human-in-the-loop validation
              </p>
            </div>
          </div>

          {/* Refresh & Sync Controls */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:inline">
                Last checked: {lastUpdated}
              </span>
            )}

            <button
              onClick={() => loadReviews(true)}
              disabled={loading || refreshing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg text-xs transition shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900/80 rounded-xl p-4 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3 text-xs sm:text-sm">
              <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold">Unable to sync pending reviews</p>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => loadReviews(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-2xs shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dashboard Bar: Search & Quick Metrics */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ref #, project, owner, contractor..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none dark:text-slate-100"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            <span>
              Showing <strong className="text-slate-900 dark:text-slate-100">{filteredProjects.length}</strong> of{' '}
              <strong className="text-slate-900 dark:text-slate-100">{projects.length}</strong> items
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          /* Loading Skeleton Table */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                No pending reviews
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All lead projects have been reviewed or there are no new items awaiting approval. Click Refresh anytime to fetch updated items from n8n.
              </p>
            </div>
            <button
              onClick={() => loadReviews(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs cursor-pointer"
            >
              Refresh Now
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Search No Match */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
            No projects matched your search &quot;{searchQuery}&quot;.
          </div>
        ) : (
          /* Main Project Table */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">S.No.</th>
                    <th className="py-3.5 px-4">Ref #</th>
                    <th className="py-3.5 px-4">Project Name</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Contractor</th>
                    <th className="py-3.5 px-4">Confidence</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredProjects.map((project, idx) => {
                    const row = getTableRowSummary(project, idx);
                    const isHighConfidence = row.confidence.toLowerCase().includes('high');
                    const isMedConfidence = row.confidence.toLowerCase().includes('medium');

                    return (
                      <tr
                        key={row.referenceNumber + '-' + idx}
                        onClick={() => handleOpenProject(project)}
                        className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-400 dark:text-slate-500">
                          {row.sNo}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {row.referenceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                          {row.projectName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                          {row.location}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-[150px] truncate font-medium">
                          {row.owner}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                          {row.contractor}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isHighConfidence
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : isMedConfidence
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isHighConfidence
                                  ? 'bg-emerald-500'
                                  : isMedConfidence
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            ></span>
                            {row.confidence}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {row.needsReview}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProject(project);
                            }}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 font-semibold rounded-md text-slate-700 dark:text-slate-200 text-xs transition cursor-pointer"
                          >
                            Review →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Project Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProject(null);
          }}
          onActionSuccess={handleActionSuccess}
        />
      )}
    </main>
  );
}
