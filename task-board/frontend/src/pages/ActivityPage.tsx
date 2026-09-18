import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useActivityStore } from '../features/activities/activityStore';
import { useProjectStore } from '../features/projects/projectStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useAuthStore } from '../features/auth/authStore';
import { Spinner } from '../components/Spinner';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const user = useAuthStore((s) => s.user);
  const members = useWorkspaceStore((s) => s.members);
  const {
    activities,
    scope,
    selectedProjectId,
    dateFrom,
    dateTo,
    actionFilter,
    page,
    limit,
    totalPages,
    totalCount,
    isLoading,
    error,
    setScope,
    setSelectedProjectId,
    setDateFrom,
    setDateTo,
    setActionFilter,
    setPageSize,
    setPage,
    fetchActivities,
  } = useActivityStore();

  const { projects, fetchProjects } = useProjectStore();

  const userMember = members.find((m) => m.id === user?.id);
  const userRole = userMember?.role || 'member';
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    if (workspaceId) {
      fetchProjects(workspaceId);
    }
  }, [workspaceId, fetchProjects]);

  useEffect(() => {
    if (workspaceId) {
      fetchActivities(workspaceId, { scope, projectId: selectedProjectId, dateFrom, dateTo, action: actionFilter, page, limit });
    }
  }, [workspaceId, scope, selectedProjectId, dateFrom, dateTo, actionFilter, page, limit, fetchActivities]);

  useEffect(() => {
    if (!isAdmin && scope === 'workspace') {
      setScope('my');
    }
  }, [isAdmin, scope, setScope]);

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
          LOG VIEWER & AUDIT TRAIL
        </span>
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
          Activity History
        </h3>
        <p className="text-xs text-text-secondary font-mono mt-1">
          Audit trails, user actions, and modification logs.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface border border-border p-4 rounded-sm space-y-4 font-mono text-xs">
        {/* Scope Tabs */}
        <div className="flex border-b border-border space-x-1 pb-2 overflow-x-auto whitespace-nowrap">
          {isAdmin && (
            <button
              onClick={() => setScope('workspace')}
              className={`py-1.5 px-3 rounded-sm font-bold uppercase tracking-wider transition-colors shrink-0 text-[11px] ${
                scope === 'workspace'
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              Workspace Activity
            </button>
          )}
          <button
            onClick={() => setScope('my')}
            className={`py-1.5 px-3 rounded-sm font-bold uppercase tracking-wider transition-colors shrink-0 text-[11px] ${
              scope === 'my'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            My Activity
          </button>
          <button
            onClick={() => setScope('project')}
            className={`py-1.5 px-3 rounded-sm font-bold uppercase tracking-wider transition-colors shrink-0 text-[11px] ${
              scope === 'project'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            Project Activity
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Project:</span>
              <select
                value={selectedProjectId || 'All'}
                onChange={(e) => setSelectedProjectId(e.target.value === 'All' ? null : e.target.value)}
                className="bg-input border border-border rounded-sm py-1.5 px-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-primary max-w-[160px]"
              >
                <option value="All">ALL</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">From:</span>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={(e) => setDateFrom(e.target.value || null)}
                className="bg-input border border-border rounded-sm py-1.5 px-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-primary max-w-[140px]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">To:</span>
              <input
                type="date"
                value={dateTo || ''}
                onChange={(e) => setDateTo(e.target.value || null)}
                className="bg-input border border-border rounded-sm py-1.5 px-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-primary max-w-[140px]"
              />
            </div>

            {/* Action Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Action:</span>
              <input
                type="text"
                value={actionFilter || ''}
                onChange={(e) => setActionFilter(e.target.value || null)}
                placeholder="e.g. Task Created"
                className="bg-input border border-border rounded-sm py-1.5 px-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-primary max-w-[160px] placeholder:text-text-faint"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Show:</span>
              <select
                value={limit}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="bg-input border border-border rounded-sm py-1.5 px-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-primary"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
              Total: {totalCount}
            </div>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="border border-border bg-surface rounded-sm p-4 sm:p-6 space-y-4">
        {error && (
          <div className="p-3 border border-danger bg-danger-light text-danger text-xs font-mono rounded-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-xs text-text-secondary font-mono">
            <Spinner />
            <span>Loading activity logs...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-secondary font-mono italic border border-dashed border-border rounded-sm">
            No activity logs found for the current filters.
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {activities.map((act) => (
              <div
                key={act.id}
                className="border border-border bg-surface-hover p-3.5 rounded-sm flex items-start space-x-3 hover:border-border-strong transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-[10px] text-text-secondary shrink-0">
                  {getInitials(act.user?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1">
                    <span className="text-text-primary font-bold block leading-snug">
                      {act.action}
                    </span>
                    <span className="text-[10px] text-text-muted shrink-0 md:text-right">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {act.description && (
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                      {act.description}
                    </p>
                  )}
                  {act.user && (
                    <span className="text-[9px] text-text-muted mt-1.5 block">
                      {act.user.name} ({act.user.email})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-border pt-4 font-mono text-xs">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isLoading}
              className="flex items-center gap-1 py-1.5 px-3 border border-border rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-40 font-bold uppercase text-[11px] transition-colors btn-press"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="text-text-faint px-1">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    disabled={p === page}
                    className={`w-8 h-8 rounded-sm font-bold text-[11px] transition-colors btn-press ${
                      p === page
                        ? 'bg-primary text-white'
                        : 'border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || isLoading}
              className="flex items-center gap-1 py-1.5 px-3 border border-border rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-40 font-bold uppercase text-[11px] transition-colors btn-press"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
