import React from 'react';
import type { Task, Project } from '../../schemas';
import { ProjectStatus } from '../../schemas';
import { useProjectStore } from './projectStore';
import { useToastStore } from '../../components/common/toastStore';

interface ProjectOverviewProps {
  project: Project;
  tasks: Task[];
  members: Array<{ id: string; name: string; email: string; role: string }>;
  canManage: boolean;
  onOpenManageTeam: () => void;
  onOpenTaskDrawer: (task: Task) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  tasks,
  members,
  canManage,
  onOpenManageTeam,
  onOpenTaskDrawer,
}) => {
  const updateProject = useProjectStore((state) => state.updateProject);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => {
    // Check if task is archived or completed
    return t.columnId && t.columnId.toLowerCase().includes('done');
  }).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && new Date(t.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as any;
    try {
      await updateProject(project.id, { status: newStatus });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update project status';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    }
  };

  const projectHead = members.find((m) => m.role === 'head');

  return (
    <div className="space-y-8 font-sans">
      {/* Overview Banner */}
      <div className="bg-surface border border-border p-6 rounded-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
              PROJECT OVERVIEW & STATUS
            </span>
            <h2 className="text-2xl font-black uppercase text-text-primary">{project.name}</h2>
            {project.description && (
              <p className="text-xs text-text-secondary mt-1 max-w-2xl font-medium leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono uppercase text-text-muted">Status:</span>
            {canManage ? (
              <select
                value={project.status}
                onChange={handleStatusChange}
                className="bg-input border border-border text-xs font-mono font-bold uppercase py-1.5 px-3 rounded-sm text-primary focus:outline-none focus:border-primary cursor-pointer"
              >
                {ProjectStatus.options.map((st) => (
                  <option key={st} value={st}>
                    {st.toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-mono font-bold uppercase bg-surface-active px-3 py-1.5 rounded-sm border border-border text-primary">
                {project.status}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="font-bold text-text-primary uppercase">Completion Progress</span>
            <span className="font-black text-primary">{progressPercentage}% ({completedTasks}/{totalTasks} Tasks)</span>
          </div>
          <div className="w-full bg-border h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-5 rounded-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted">TOTAL TASKS</span>
          <div className="text-2xl font-black text-text-primary">{totalTasks}</div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted">COMPLETED TASKS</span>
          <div className="text-2xl font-black text-success">{completedTasks}</div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted">OVERDUE TASKS</span>
          <div className={`text-2xl font-black ${overdueTasks > 0 ? 'text-danger' : 'text-text-primary'}`}>
            {overdueTasks}
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted">PROJECT HEAD</span>
          <div className="text-base font-black text-primary truncate">
            {projectHead ? projectHead.name.toUpperCase() : 'NOT ASSIGNED'}
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Team Members & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <div className="bg-surface border border-border p-6 rounded-sm space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-sm font-black uppercase text-text-primary">PROJECT MEMBERS ({members.length})</h3>
            {canManage && (
              <button
                onClick={onOpenManageTeam}
                className="text-xs font-mono font-bold text-primary hover:text-primary-hover uppercase"
              >
                Manage Team &rarr;
              </button>
            )}
          </div>

          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex justify-between items-center p-2.5 bg-surface-hover border border-border rounded-sm text-xs font-mono">
                <div>
                  <span className="font-bold text-text-primary">{m.name.toUpperCase()}</span>
                  <span className="text-text-muted block text-[10px]">{m.email}</span>
                </div>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-xs ${
                  m.role === 'head' ? 'bg-primary text-white' : 'bg-surface-active text-text-secondary'
                }`}>
                  {m.role === 'head' ? 'PROJECT HEAD' : 'MEMBER'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-surface border border-border p-6 rounded-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-black uppercase text-text-primary">UPCOMING DEADLINES</h3>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="text-xs font-mono text-text-muted italic py-6 text-center border border-dashed border-border rounded-sm">
              No upcoming deadlines scheduled.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTaskDrawer(t)}
                  className="flex justify-between items-center p-2.5 bg-surface-hover border border-border hover:border-primary rounded-sm text-xs font-mono cursor-pointer transition-colors"
                >
                  <span className="font-bold text-text-primary truncate max-w-[200px]">{t.title}</span>
                  <span className="text-[10px] text-primary font-bold">
                    {new Date(t.dueDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
