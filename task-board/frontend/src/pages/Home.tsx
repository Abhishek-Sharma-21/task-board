import React, { useEffect, useMemo } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useProjectStore } from '../features/projects/projectStore';
import { useBoardStore } from '../features/boards/boardStore';
import { useAnalyticsStore } from '../features/analytics/analyticsStore';
import { useNavigate } from 'react-router-dom';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { AlertTriangle, Folder, ArrowRight } from 'lucide-react';
import { getTaskHealth } from '../utils/taskHealth';
import type { Task } from '../schemas';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { activeWorkspace, members } = useWorkspaceStore();
  const { projects } = useProjectStore();
  const { tasksByColumn } = useBoardStore();
  const { analytics, isLoading, fetchWorkspaceAnalytics } = useAnalyticsStore();

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchWorkspaceAnalytics(activeWorkspace.id);
    }
  }, [activeWorkspace?.id, fetchWorkspaceAnalytics]);

  const userMember = members.find((m) => m.id === user?.id);
  const userRole = userMember ? userMember.role : 'member';
  const userName = user?.name ? user.name.toUpperCase() : 'USER';

  const allTasks = useMemo(() => {
    const tasks: Task[] = [];
    Object.values(tasksByColumn).forEach((colTasks) => {
      tasks.push(...colTasks);
    });
    return tasks;
  }, [tasksByColumn]);

  const attentionTasks = useMemo(() => {
    if (!user) return [];

    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0);

    const isCompleted = (task: Task): boolean => {
      return (
        !!task.isCompleted ||
        !!task.isArchived ||
        (task.status?.toLowerCase().includes('done') ?? false) ||
        (task.status?.toLowerCase().includes('complete') ?? false)
      );
    };

    const getDueDate = (task: Task): Date | null => {
      if (!task.dueDate) return null;
      const d = new Date(task.dueDate);
      return isNaN(d.getTime()) ? null : d;
    };

    return allTasks
      .filter((task) => {
        if (isCompleted(task)) return false;
        if (!(task.assignees || []).some(a => a.id === user.id)) return false;
        const dueDate = getDueDate(task);
        if (!dueDate) return false;
        const dueDay = new Date(dueDate);
        dueDay.setHours(0, 0, 0, 0);
        return dueDay <= TODAY;
      })
      .sort((a, b) => {
        const dateA = getDueDate(a);
        const dateB = getDueDate(b);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [allTasks, user]);

  const recentProjects = useMemo(() => {
    return projects.slice(0, 4);
  }, [projects]);

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
    <div className="space-y-8 font-sans">
      {/* Compact Header Banner */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
            {getCurrentDateFormatted()} · {activeWorkspace?.name.toUpperCase() || 'WORKSPACE'}
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-text-primary">
            WELCOME, {userName}.
          </h1>
        </div>
        <div className="flex items-center space-x-2 bg-surface border border-border py-1.5 px-3 rounded-sm text-[10px] font-mono text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
          <span className="uppercase font-bold tracking-wider">{userRole}</span>
        </div>
      </div>

      {/* Analytics Statistics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-border p-4 rounded-sm">
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">
              PROJECTS & MEMBERS
            </span>
            <div className="text-2xl font-black text-text-primary mt-1">
              {analytics?.totalProjects ?? projects.length}
            </div>
            <p className="text-[10px] text-text-muted font-mono">
              {analytics?.activeProjects ?? projects.length} Active · {members.length} Members
            </p>
          </div>

          <div className="bg-surface border border-border p-4 rounded-sm">
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">
              TOTAL TASKS
            </span>
            <div className="text-2xl font-black text-text-primary mt-1">
              {analytics?.totalTasks ?? 0}
            </div>
            <p className="text-[10px] text-text-muted font-mono">
              {analytics?.completedTasks ?? 0} Completed · {analytics?.inProgressTasks ?? 0} In Progress
            </p>
          </div>

          <div className="bg-surface border border-border p-4 rounded-sm">
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">
              ASSIGNED TO YOU
            </span>
            <div className="text-2xl font-black text-primary mt-1">
              {analytics?.assignedToUserTasks ?? 0}
            </div>
            <p className="text-[10px] text-text-muted font-mono">
              {analytics?.completedThisWeek ?? 0} Completed This Week
            </p>
          </div>

          <div className="bg-surface border border-border p-4 rounded-sm">
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">
              OVERDUE TASKS
            </span>
            <div className={`text-2xl font-black ${(analytics?.overdueTasks ?? 0) > 0 ? 'text-danger' : 'text-success'} mt-1`}>
              {analytics?.overdueTasks ?? 0}
            </div>
            <p className="text-[10px] text-text-muted font-mono">
              {(analytics?.overdueTasks ?? 0) > 0 ? 'Requires attention' : 'All on track'}
            </p>
          </div>
        </div>
      )}

      {/* Attention Needed Section */}
      {attentionTasks.length > 0 && (
        <div className="bg-surface border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <span className="text-[10px] uppercase font-mono tracking-widest text-danger font-bold">
                ATTENTION NEEDED
              </span>
            </div>
            <button
              onClick={() => navigate('/my-work')}
              className="text-[10px] font-mono font-bold text-primary hover:text-primary-hover uppercase tracking-wider flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {attentionTasks.map((task) => {
              const health = getTaskHealth(task);
              return (
                <div
                  key={task.id}
                  onClick={() => {
                    if (activeWorkspace?.id && task.projectId && task.boardId) {
                      navigate(`/workspaces/${activeWorkspace.id}/projects/${task.projectId}/boards/${task.boardId}`);
                    }
                  }}
                  className="flex items-center justify-between p-3 bg-surface-hover border border-border hover:border-primary rounded-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-1 h-8 rounded-full ${
                      health.health === 'overdue' ? 'bg-red-500' :
                      health.health === 'needs_attention' ? 'bg-amber-500' :
                      health.health === 'blocked' ? 'bg-red-500' :
                      'bg-green-500'
                    }`}></div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-text-primary truncate">{task.title}</h4>
                      <div className="flex items-center space-x-2 text-[10px] font-mono text-text-muted">
                        <span>{projects.find((p) => p.id === task.projectId)?.name || 'Unknown'}</span>
                        {task.dueDate && (
                          <>
                            <span>·</span>
                            <span>Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[9px] font-mono font-bold uppercase ${health.color}`}>
                      {health.label}
                    </span>
                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm border ${
                      task.priority === 'Urgent' ? 'bg-red-100 text-red-700 border-red-200' :
                      task.priority === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Projects Section */}
      <div className="bg-surface border border-border rounded-sm p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-primary" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted">
              RECENT PROJECTS
            </span>
          </div>
          <button
            onClick={() => {
              if (activeWorkspace?.id) navigate(`/workspaces/${activeWorkspace.id}/settings`);
            }}
            className="text-[10px] font-mono font-bold text-primary hover:text-primary-hover uppercase tracking-wider flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentProjects.map((proj) => {
              const metric = analytics?.projectMetrics.find((pm) => pm.id === proj.id);
              const percentage = metric ? metric.completionPercentage : 0;
              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    if (activeWorkspace?.id) navigate(`/workspaces/${activeWorkspace.id}/projects/${proj.id}`);
                  }}
                  className="bg-surface-hover border border-border hover:border-primary p-4 rounded-sm cursor-pointer transition-colors space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-black uppercase text-text-primary break-words min-w-0">{proj.name}</h3>
                    <span className="text-[8px] font-mono font-bold uppercase bg-surface-active px-1.5 py-0.5 rounded-sm text-text-secondary shrink-0">
                      {proj.status}
                    </span>
                  </div>
                  {metric && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono text-text-muted">
                        <span>{metric.completedTasks}/{metric.totalTasks} Tasks</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full bg-border h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className="text-[9px] font-mono text-primary font-bold flex items-center gap-1">
                    Open <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No projects yet"
            description="Create your first project to get started."
            actionLabel={userRole === 'owner' || userRole === 'admin' ? "Manage Projects" : undefined}
            onAction={() => {
              if (activeWorkspace?.id) navigate(`/workspaces/${activeWorkspace.id}/settings`);
            }}
          />
        )}
      </div>
    </div>
  );
};
