import React from 'react';
import { Task, BoardColumn } from '../../schemas';
import { useBoardStore } from './boardStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';

interface TaskListViewProps {
  tasks: Task[];
  columns: BoardColumn[];
  onOpenTask: (task: Task) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, columns, onOpenTask }) => {
  const duplicateTask = useBoardStore((state) => state.duplicateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const members = useWorkspaceStore((state) => state.members);

  const getColumnName = (colId: string) => {
    return columns.find((c) => c.id === colId)?.name || 'Unknown';
  };

  const getAssigneeName = (assigneeId?: string | null) => {
    if (!assigneeId) return 'Unassigned';
    const m = members.find((mem) => mem.id === assigneeId);
    return m ? m.name : 'Assigned';
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'High':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Medium':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const isOverdue = (dueDate?: string | Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-border rounded-sm">
        <p className="text-sm font-mono text-text-muted">NO TASKS MATCH THE CURRENT FILTER OR SEARCH CRITERIA</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-border rounded-sm bg-surface">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-border bg-surface-hover text-[10px] font-mono uppercase tracking-wider text-text-muted">
            <th className="py-2.5 px-4">Task</th>
            <th className="py-2.5 px-4">Status / Column</th>
            <th className="py-2.5 px-4">Priority</th>
            <th className="py-2.5 px-4">Assignee</th>
            <th className="py-2.5 px-4">Due Date</th>
            <th className="py-2.5 px-4">Subtasks</th>
            <th className="py-2.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-xs font-mono">
          {tasks.map((task) => {
            const completedChecklists = (task.checklists || []).filter((c) => c.completed).length;
            const totalChecklists = (task.checklists || []).length;

            return (
              <tr
                key={task.id}
                className="hover:bg-surface-hover/80 transition-colors group cursor-pointer"
                onClick={() => onOpenTask(task)}
              >
                <td className="py-3 px-4">
                  <div className="font-semibold text-text-primary group-hover:text-primary transition-colors flex items-center space-x-2">
                    <span>{task.title}</span>
                    {task.isArchived && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-bold">
                        Archived
                      </span>
                    )}
                  </div>
                  {task.labels && task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.labels.map((lbl) => (
                        <span
                          key={lbl}
                          className="text-[9px] px-1.5 py-0.2 bg-surface-active text-text-muted rounded border border-border"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded bg-surface-active text-text-secondary text-[11px] font-medium border border-border">
                    {getColumnName(task.columnId)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getPriorityStyle(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                </td>
                <td className="py-3 px-4 text-text-secondary">
                  {getAssigneeName(task.assigneeId)}
                </td>
                <td className="py-3 px-4">
                  {task.dueDate ? (
                    <span
                      className={`text-[11px] ${
                        isOverdue(task.dueDate) ? 'text-red-400 font-bold' : 'text-text-muted'
                      }`}
                    >
                      {new Date(task.dueDate).toLocaleDateString()}
                      {isOverdue(task.dueDate) && ' (OVERDUE)'}
                    </span>
                  ) : (
                    <span className="text-text-muted text-[11px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-text-muted text-[11px]">
                  {totalChecklists > 0 ? `${completedChecklists}/${totalChecklists}` : '—'}
                </td>
                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => duplicateTask(task.id)}
                      className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-surface-active hover:bg-surface-hover text-text-primary rounded border border-border transition-colors"
                      title="Duplicate task"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 transition-colors"
                      title="Delete task"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
