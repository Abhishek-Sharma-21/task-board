import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useActivityStore } from '../features/activities/activityStore';
import { useProjectStore } from '../features/projects/projectStore';
import { Spinner } from '../components/Spinner';

export const ActivityPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const {
    activities,
    scope,
    selectedProjectId,
    page,
    totalPages,
    totalCount,
    isLoading,
    error,
    setScope,
    setSelectedProjectId,
    setPage,
    fetchActivities,
  } = useActivityStore();

  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    if (workspaceId) {
      fetchProjects(workspaceId);
    }
  }, [workspaceId, fetchProjects]);

  useEffect(() => {
    if (workspaceId) {
      fetchActivities(workspaceId, { scope, projectId: selectedProjectId, page });
    }
  }, [workspaceId, scope, selectedProjectId, page, fetchActivities]);

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 font-sans">
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
          LOG VIEWER & AUDIT TRAIL
        </span>
        <h3 className="text-3xl font-black uppercase tracking-tight text-text-primary">
          ACTIVITY HISTORY.
        </h3>
        <p className="text-xs text-text-secondary font-mono mt-1">
          Audit trails, user actions, and system modification logs.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="max-w-4xl bg-surface border border-border p-4 rounded-sm space-y-4 font-mono text-xs">
        {/* Scopes Tabs */}
        <div className="flex border-b border-border space-x-2 pb-2 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setScope('workspace')}
            className={`py-1.5 px-3 rounded-sm font-bold uppercase tracking-wider transition-colors shrink-0 ${
              scope === 'workspace'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            Workspace Activity
          </button>

          <button
            onClick={() => setScope('my')}
            className={`py-1.5 px-3 rounded-sm font-bold uppercase tracking-wider transition-colors shrink-0 ${
              scope === 'my'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            My Activity
          </button>

          <button
            onClick={() => setScope('project')}
            className={`py-1.5 px-3 rounded-sm font-bold uppercase tracking-wider transition-colors shrink-0 ${
              scope === 'project'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            Project Activity
          </button>
        </div>

        {/* Project Selector Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Filter Project:</span>
            <select
              value={selectedProjectId || 'All'}
              onChange={(e) => setSelectedProjectId(e.target.value === 'All' ? null : e.target.value)}
              className="bg-input border border-border rounded-sm py-1.5 px-3 text-text-primary font-mono text-xs focus:outline-none focus:border-primary max-w-[200px] sm:max-w-xs"
            >
              <option value="All">ALL PROJECTS</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest self-end sm:self-auto">
            Total Logs: {totalCount}
          </div>
        </div>
      </div>

      {/* Main Activity Content */}
      <div className="max-w-4xl border border-border bg-surface rounded-sm p-4 sm:p-6 space-y-6">
        {error && (
          <div className="p-4 border border-danger bg-danger-light text-danger text-xs font-mono rounded-sm">
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
            No activity logs found for this filter scope.
          </div>
        ) : (
          <div className="space-y-4 font-mono text-xs">
            {activities.map((act) => (
              <div
                key={act.id}
                className="border border-border bg-surface-hover p-4 rounded-sm flex items-start space-x-4 hover:border-border-strong transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-[10px] text-text-secondary shrink-0">
                  {getInitials(act.user?.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1">
                    <span className="text-text-primary font-bold block leading-snug">
                      {act.action}
                    </span>
                    <span className="text-[10px] text-text-muted shrink-0 md:text-right font-mono">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {act.description && (
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                      {act.description}
                    </p>
                  )}
                  {act.user && (
                    <span className="text-[9px] text-text-muted font-mono mt-2 block">
                      Executed by: {act.user.name} ({act.user.email})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-border pt-4 font-mono text-xs">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isLoading}
              className="py-1.5 px-3 border border-border rounded-sm text-text-secondary hover:text-text-primary disabled:opacity-50 font-bold uppercase"
            >
              &larr; Previous
            </button>
            <span className="text-text-muted text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || isLoading}
              className="py-1.5 px-3 border border-border rounded-sm text-text-secondary hover:text-text-primary disabled:opacity-50 font-bold uppercase"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
