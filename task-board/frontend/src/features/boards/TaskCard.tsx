import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../schemas';

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

  // Priority color tags
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-priority-urgent-bg text-priority-urgent border-priority-urgent-border';
      case 'High':
        return 'bg-priority-high-bg text-priority-high border-priority-high-border';
      case 'Medium':
        return 'bg-priority-medium-bg text-priority-medium border-priority-medium-border';
      default:
        return 'bg-priority-low-bg text-priority-low border-priority-low-border';
    }
  };

  const getDueDateString = (date?: Date | string) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
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
      className={`group select-none border-2 border-border bg-kanban-card p-4 hover:border-border-strong transition-colors rounded-sm shadow-theme-md flex flex-col space-y-4 ${
        task.isArchived ? 'opacity-60 bg-surface/50 border-dashed' : isDone ? 'bg-success-light/30 border-success-border/50' : ''
      }`}
    >
      {/* Project Badge */}
      {task.projectName && (
        <div className="flex items-center">
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-primary bg-primary-light/50 border border-primary-border/60 px-1.5 py-0.5 rounded-sm">
            📁 {task.projectName}
          </span>
        </div>
      )}

      {/* Title & Priority */}
      <div className="flex items-start justify-between gap-2">
        <h4 className={`text-sm font-bold text-text-primary tracking-tight uppercase group-hover:text-primary transition-colors line-clamp-2 break-words min-w-0 ${isDone ? 'line-through opacity-75' : ''}`}>
          {task.isArchived && <span className="text-[9px] font-mono font-bold bg-danger/20 text-danger px-1 rounded-xs mr-1">[ARCHIVED]</span>}
          {task.title}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          {isDone && (
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm bg-success-light text-success border-success-border inline-block">
              ✓ DONE
            </span>
          )}
          <span
            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm inline-block ${getPriorityStyle(task.priority)}`}
          >
            {task.priority}
          </span>
        </div>
      </div>

      {/* Description Preview */}
      {task.description && (
        <p className="text-xs text-text-muted font-medium line-clamp-2 leading-relaxed break-words">
          {task.description}
        </p>
      )}

      {/* Tags & Checklists Badges */}
      <div className="flex flex-wrap gap-1 items-center">
        {checklists.length > 0 && (
          <span className="bg-surface-active border border-border text-text-secondary font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
            ✓ {completedChecklists}/{checklists.length}
          </span>
        )}
        {task.labels && task.labels.map((lbl: string) => (
          <span
            key={lbl}
            className="bg-tag border border-tag-border text-tag-text font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm break-all"
          >
            {lbl}
          </span>
        ))}
      </div>

      {/* Bottom Bar: Due Date & Assignee Initials */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        {/* Due Date */}
        {task.dueDate ? (
          <div className="flex items-center space-x-1.5 text-[9px] font-mono text-text-muted uppercase tracking-widest">
            <svg className="w-3.5 h-3.5 text-text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{getDueDateString(task.dueDate)}</span>
          </div>
        ) : (
          <div />
        )}

        {/* Assignee Avatar */}
        {task.assigneeId ? (
          <div className="w-6 h-6 rounded-full bg-primary border border-border flex items-center justify-center text-[9px] font-bold text-white tracking-tighter shadow-sm">
            A
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-surface-active border border-border flex items-center justify-center text-[10px] text-text-faint">
            ?
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskCard = React.memo(TaskCardComponent);
