import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useBoardStore } from '../features/boards/boardStore';
import { useProjectStore } from '../features/projects/projectStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, AlertTriangle, Clock, CheckCircle2, Ban, UserCheck, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { getTaskHealth, type TaskHealthResult } from '../utils/taskHealth';
import { parseLocalDate, todayString } from '../utils/dates';
import type { Task } from '../schemas';

interface TaskSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  color: string;
  bgColor: string;
}

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const colors: Record<string, string> = {
    'Low': 'bg-blue-100 text-blue-700 border-blue-200',
    'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'High': 'bg-orange-100 text-orange-700 border-orange-200',
    'Urgent': 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${colors[priority] || colors['Medium']}`}>
      {priority}
    </span>
  );
};

const HealthIndicator: React.FC<{ health: TaskHealthResult }> = ({ health }) => {
  return (
    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${health.color}`}>
      {health.label}
    </span>
  );
};

export const MyWorkPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { tasksByColumn } = useBoardStore();
  const { projects } = useProjectStore();
  const { activeWorkspace } = useWorkspaceStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    today: true,
    overdue: true,
    upcoming: true,
    waiting: false,
    blocked: false,
    completed: false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const allTasks = useMemo(() => {
    const tasks: Task[] = [];
    Object.values(tasksByColumn).forEach((colTasks) => {
      tasks.push(...colTasks);
    });
    return tasks;
  }, [tasksByColumn]);

  const sections: TaskSection[] = useMemo(() => {
    if (!user) return [];

    const isCompleted = (task: Task): boolean => {
      return (
        !!task.isCompleted ||
        !!task.isArchived ||
        (task.status?.toLowerCase().includes('done') ?? false) ||
        (task.status?.toLowerCase().includes('complete') ?? false)
      );
    };

    const isBlocked = (task: Task): boolean => {
      const colName = task.columnName?.toLowerCase() || '';
      const status = task.status?.toLowerCase() || '';
      return colName.includes('block') || status.includes('block');
    };

    const getDueDate = (task: Task): string | null => {
      if (!task.dueDate) return null;
      return parseLocalDate(task.dueDate);
    };

    const today = todayString();

    const todayTasks = allTasks.filter((task) => {
      if (isCompleted(task)) return false;
      if (!(task.assignees || []).some(a => a.id === user.id)) return false;
      const dueDate = getDueDate(task);
      if (!dueDate) return false;
      return dueDate === today;
    });

    const overdueTasks = allTasks.filter((task) => {
      if (isCompleted(task)) return false;
      if (!(task.assignees || []).some(a => a.id === user.id)) return false;
      const dueDate = getDueDate(task);
      if (!dueDate) return false;
      return dueDate < today;
    });

    const upcomingTasks = allTasks.filter((task) => {
      if (isCompleted(task)) return false;
      if (!(task.assignees || []).some(a => a.id === user.id)) return false;
      const dueDate = getDueDate(task);
      if (!dueDate) return false;
      return dueDate > today;
    });

    const waitingTasks = allTasks.filter((task) => {
      if (isCompleted(task)) return false;
      if ((task.assignees || []).some(a => a.id === user.id)) return false;
      return task.assignees && task.assignees.length > 0;
    });

    const blockedTasks = allTasks.filter((task) => {
      if (isCompleted(task)) return false;
      return isBlocked(task);
    });

    const completedTasks = allTasks.filter((task) => {
      return isCompleted(task) && (task.assignees || []).some(a => a.id === user.id);
    });

    return [
      {
        id: 'today',
        title: 'TODAY',
        icon: <CalendarClock className="w-4 h-4" />,
        tasks: todayTasks,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200',
      },
      {
        id: 'overdue',
        title: 'OVERDUE',
        icon: <AlertTriangle className="w-4 h-4" />,
        tasks: overdueTasks,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
      },
      {
        id: 'upcoming',
        title: 'UPCOMING',
        icon: <Clock className="w-4 h-4" />,
        tasks: upcomingTasks,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
      },
      {
        id: 'waiting',
        title: 'WAITING FOR',
        icon: <UserCheck className="w-4 h-4" />,
        tasks: waitingTasks,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 border-purple-200',
      },
      {
        id: 'blocked',
        title: 'BLOCKED',
        icon: <Ban className="w-4 h-4" />,
        tasks: blockedTasks,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
      },
      {
        id: 'completed',
        title: 'COMPLETED',
        icon: <CheckCircle2 className="w-4 h-4" />,
        tasks: completedTasks,
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
      },
    ];
  }, [allTasks, user]);

  const getProjectName = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    const d = parseLocalDate(date);
    return d;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
          {activeWorkspace?.name.toUpperCase() || 'WORKSPACE'}
        </span>
        <h1 className="text-2xl font-black uppercase tracking-tight text-text-primary">
          MY WORK
        </h1>
        <p className="mt-1 text-xs text-text-muted font-mono">
          Tasks assigned to you across all boards
        </p>
      </div>

      {/* Task Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className={`border rounded-sm ${section.bgColor}`}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center space-x-3">
                <span className={section.color}>{section.icon}</span>
                <span className={`text-sm font-black uppercase tracking-wider ${section.color}`}>
                  {section.title}
                </span>
                <span className="text-[10px] font-mono text-text-muted bg-white/50 px-1.5 py-0.5 rounded-sm">
                  {section.tasks.length}
                </span>
              </div>
              {expandedSections[section.id] ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {expandedSections[section.id] && section.tasks.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                {section.tasks.map((task) => {
                  const health = getTaskHealth(task);
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        if (activeWorkspace?.id && task.projectId && task.boardId) {
                          navigate(`/workspaces/${activeWorkspace.id}/projects/${task.projectId}/boards/${task.boardId}`);
                        }
                      }}
                      className="bg-white/60 border border-border hover:border-primary p-3 rounded-sm cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-text-primary break-words min-w-0">
                          {task.title}
                        </h4>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-[10px] font-mono text-text-muted">
                            <Folder className="w-3 h-3" />
                            <span>{getProjectName(task.projectId)}</span>
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center space-x-1 text-[10px] font-mono text-text-muted">
                              <CalendarClock className="w-3 h-3" />
                              <span>{formatDate(task.dueDate)}</span>
                            </div>
                          )}
                        </div>
                        <HealthIndicator health={health} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {expandedSections[section.id] && section.tasks.length === 0 && (
              <div className="px-4 pb-4">
                <p className="text-xs text-text-muted font-mono italic">No tasks in this section</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
