import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useActivityStore } from '../features/activities/activityStore';

export const ActivityPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { activities, isLoading, fetchActivities } = useActivityStore();

  useEffect(() => {
    if (workspaceId) {
      fetchActivities(workspaceId);
    }
  }, [workspaceId, fetchActivities]);

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
    <div className="space-y-8">
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
          LOG VIEWER
        </span>
        <h3 className="text-2xl font-black uppercase tracking-tight text-text-primary font-sans">
          ACTIVITY HISTORY.
        </h3>
        <p className="text-xs text-text-secondary font-mono mt-1">
          Audit trails, user actions, and modifications list.
        </p>
      </div>

      <div className="max-w-4xl border border-border bg-surface rounded-sm p-6 space-y-6">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-text-secondary font-mono">
            Loading activity logs...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-secondary font-mono italic border border-dashed border-border rounded-sm">
            No activity logs found for this workspace.
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
      </div>
    </div>
  );
};
