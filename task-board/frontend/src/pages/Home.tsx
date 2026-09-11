import React, { useEffect } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useProjectStore } from '../features/projects/projectStore';
import { useAnalyticsStore } from '../features/analytics/analyticsStore';
import { useNavigate } from 'react-router-dom';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { activeWorkspace, members } = useWorkspaceStore();
  const { projects } = useProjectStore();
  const { analytics, isLoading, fetchWorkspaceAnalytics } = useAnalyticsStore();

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchWorkspaceAnalytics(activeWorkspace.id);
    }
  }, [activeWorkspace?.id, fetchWorkspaceAnalytics]);

  const userMember = members.find((m) => m.id === user?.id);
  const userRole = userMember ? userMember.role : 'member';
  const userName = user?.name ? user.name.toUpperCase() : 'USER';

  const getCurrentDateFormatted = () => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const now = new Date();
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    return `${dayName}, ${monthName} ${date}`;
  };

  return (
    <div className="space-y-10 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-text-muted block mb-2">
            {getCurrentDateFormatted()} · {activeWorkspace?.name.toUpperCase() || 'WORKSPACE'}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-text-primary leading-none">
            WELCOME, {userName}.
          </h1>
          <p className="mt-2 text-sm text-text-secondary font-medium">
            Real-time analytics and workspace overview for {activeWorkspace?.name || 'your active workspace'}.
          </p>
        </div>

        <div className="self-start md:self-center flex items-center space-x-2 bg-surface border border-border py-2 px-4 rounded-full text-xs font-mono text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-success inline-block animate-pulse"></span>
          <span className="uppercase font-bold tracking-wider">{userRole} ROLE</span>
        </div>
      </div>

      {/* Analytics Statistics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface border border-border p-6 rounded-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              PROJECTS & MEMBERS
            </span>
            <div className="text-3xl font-black text-text-primary">
              {analytics?.totalProjects ?? projects.length}
            </div>
            <p className="text-xs text-text-muted font-mono">
              {analytics?.activeProjects ?? projects.length} Active · {members.length} Team Members
            </p>
          </div>

          <div className="bg-surface border border-border p-6 rounded-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              TOTAL TASKS
            </span>
            <div className="text-3xl font-black text-text-primary">
              {analytics?.totalTasks ?? 0}
            </div>
            <p className="text-xs text-text-muted font-mono">
              {analytics?.completedTasks ?? 0} Completed · {analytics?.inProgressTasks ?? 0} In Progress
            </p>
          </div>

          <div className="bg-surface border border-border p-6 rounded-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              ASSIGNED TO YOU
            </span>
            <div className="text-3xl font-black text-primary">
              {analytics?.assignedToUserTasks ?? 0}
            </div>
            <p className="text-xs text-text-muted font-mono">
              {analytics?.completedThisWeek ?? 0} Tasks Completed This Week
            </p>
          </div>

          <div className="bg-surface border border-border p-6 rounded-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              OVERDUE TASKS
            </span>
            <div className={`text-3xl font-black ${(analytics?.overdueTasks ?? 0) > 0 ? 'text-danger' : 'text-success'}`}>
              {analytics?.overdueTasks ?? 0}
            </div>
            <p className="text-xs text-text-muted font-mono">
              {(analytics?.overdueTasks ?? 0) > 0 ? 'Requires immediate attention' : 'All deadlines on track'}
            </p>
          </div>
        </div>
      )}

      {/* Projects Section */}
      <div className="bg-surface border border-border rounded-sm p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-0.5">
              WORKSPACE SCOPE
            </span>
            <h2 className="text-xl font-black uppercase text-text-primary">
              PROJECTS IN {activeWorkspace?.name.toUpperCase()}
            </h2>
          </div>

          <button
            onClick={() => navigate(`/workspaces/${activeWorkspace?.id}/settings`)}
            className="text-xs font-mono font-bold text-primary hover:text-primary-hover uppercase tracking-wider"
          >
            Manage Projects &rarr;
          </button>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const metric = analytics?.projectMetrics.find((pm) => pm.id === proj.id);
              const percentage = metric ? metric.completionPercentage : 0;
              return (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/workspaces/${activeWorkspace?.id}/projects/${proj.id}`)}
                  className="bg-surface-hover border border-border hover:border-primary p-4 rounded-sm cursor-pointer transition-colors space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-base font-black uppercase text-text-primary break-words min-w-0">{proj.name}</h3>
                    <span className="text-[9px] font-mono font-bold uppercase bg-surface-active px-2 py-0.5 rounded-sm text-text-secondary">
                      {proj.status}
                    </span>
                  </div>
                  {proj.description && (
                    <p className="text-xs text-text-muted line-clamp-2">{proj.description}</p>
                  )}
                  {metric && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-mono text-text-muted">
                        <span>{metric.completedTasks} / {metric.totalTasks} Tasks Done</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className="pt-1 text-[10px] font-mono text-primary font-bold">
                    Open Project &rarr;
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No projects yet"
            description="Create your first project in this workspace to start managing tasks and collaborating with your team."
            actionLabel={userRole === 'owner' || userRole === 'admin' ? "Manage Projects" : undefined}
            onAction={() => navigate(`/workspaces/${activeWorkspace?.id}/settings`)}
          />
        )}
      </div>
    </div>
  );
};
