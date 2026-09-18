import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../schemas';
import { parseLocalDate } from '../../utils/dates';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragDisabled?: boolean;
}

const TaskCardComponent: React.FC<TaskCardProps> = ({ task, onClick, isDragDisabled = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isDragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragDisabled ? 'pointer' : 'grab',
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-priority-urgent-bg text-priority-urgent border-priority-urgent-border border-l-priority-urgent';
      case 'High':
        return 'bg-priority-high-bg text-priority-high border-priority-high-border border-l-priority-high';
      case 'Medium':
        return 'bg-priority-medium-bg text-priority-medium border-priority-medium-border border-l-priority-medium';
      default:
        return 'bg-priority-low-bg text-priority-low border-priority-low-border border-l-priority-low';
    }
  };

  const getPriorityLeftBorder = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'border-l-[3px] border-l-priority-urgent';
      case 'High':
        return 'border-l-[3px] border-l-priority-high';
      case 'Medium':
        return 'border-l-[3px] border-l-priority-medium';
      default:
        return 'border-l-[3px] border-l-priority-low';
    }
  };

  const getDueDateString = (date?: Date | string) => {
    if (!date) return null;
    const dateStr = parseLocalDate(date);
    const [, m, d] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(m) - 1]} ${parseInt(d)}`;
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'TB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarBgColor = (name?: string) => {
    const colors = [
      'bg-blue-600 text-white',
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-purple-600 text-white',
      'bg-rose-600 text-white',
      'bg-amber-600 text-white',
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const checklists = task.checklists || [];
  const completedChecklists = checklists.filter((c) => c.completed).length;
  const isDone =
    task.isCompleted ||
    task.isArchived ||
    task.status?.toLowerCase().includes('done') ||
    task.status?.toLowerCase().includes('complete');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group select-none border border-border bg-surface-elevated p-3.5 hover:border-primary/60 hover:shadow-theme-md transition-all rounded-sm shadow-sm flex flex-col space-y-2.5 font-sans border-l-[3px] ${getPriorityLeftBorder(task.priority)} ${
        task.isArchived
          ? 'opacity-60 bg-surface/50 border-dashed'
          : isDone
          ? 'bg-surface/80 border-success/30'
          : ''
      }`}
    >
      {/* Top Row: Priority Pill Badge & Done Checkmark */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded-xs ${getPriorityBadgeStyle(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        {isDone && (
          <span title="Completed Task">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          </span>
        )}
      </div>

      {/* Title */}
      <h4
        className={`text-[11px] sm:text-xs font-bold text-text-primary tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2 break-words min-w-0 ${
          isDone ? 'line-through text-text-muted' : ''
        }`}
      >
        {task.isArchived && (
          <span className="text-[9px] font-mono font-bold bg-danger/20 text-danger px-1 rounded-xs mr-1">
            [ARCHIVED]
          </span>
        )}
        {task.title}
      </h4>

      {/* Description Preview (if any) */}
      {task.description && (
        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed break-words font-sans">
          {task.description}
        </p>
      )}

      {/* Middle Row: Due Date & Assignee Info */}
      <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-2 text-[10px] font-mono text-text-muted">
        <div className="flex items-center space-x-3">
          {task.dueDate && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-text-faint" />
              <span>{getDueDateString(task.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatars */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {task.assignees.slice(0, 3).map((assignee) => (
              <div
                key={assignee.id}
                title={assignee.name}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-mono font-black border border-surface-elevated ${getAvatarBgColor(assignee.name)}`}
              >
                {getInitials(assignee.name)}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-surface-active border border-border flex items-center justify-center text-[7px] font-mono font-bold text-text-muted">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Tags & Checklist Badge */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {checklists.length > 0 && (
          <span className="bg-surface-active border border-border text-text-secondary font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-xs">
            ✓ {completedChecklists}/{checklists.length}
          </span>
        )}
        {task.labels &&
          task.labels.map((lbl: string) => (
            <span
              key={lbl}
              className="bg-primary/10 border border-primary/20 text-primary font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs"
            >
              {lbl}
            </span>
          ))}
      </div>
    </div>
  );
};

export const TaskCard = React.memo(TaskCardComponent);
