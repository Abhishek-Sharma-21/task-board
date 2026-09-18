import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Spinner } from '../../components/Spinner';
import { Trash2, MoreVertical, Plus, ChevronRight } from 'lucide-react';
import type { BoardColumn as ColumnType, Task } from '../../schemas';

const MAX_VISIBLE_TASKS = 4;

interface BoardColumnProps {
  column: ColumnType;
  tasks: Task[];
  canManageColumns?: boolean;
  isDragDisabled?: boolean;
  taskPresence?: Record<string, Array<{ id: string; name: string }>>;
  onAddTask: (title: string) => Promise<void>;
  onDeleteColumn: () => void;
  onRenameColumn: (name: string) => void;
  onTaskClick: (task: Task) => void;
  onViewAllTasks?: (column: ColumnType, tasks: Task[]) => void;
}

const BoardColumnComponent: React.FC<BoardColumnProps> = ({
  column,
  tasks,
  canManageColumns = false,
  isDragDisabled = false,
  taskPresence = {},
  onAddTask,
  onDeleteColumn,
  onRenameColumn,
  onTaskClick,
  onViewAllTasks,
}) => {
  const { setNodeRef } = useDroppable({ id: column.id });

  const [isAdding, setIsAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [colName, setColName] = useState(column.name);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
  const hiddenCount = tasks.length - MAX_VISIBLE_TASKS;

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || isSubmittingTask) return;
    setIsSubmittingTask(true);
    try {
      await onAddTask(taskTitle.trim());
      setTaskTitle('');
      setIsAdding(false);
    } catch (err) {
      // handled
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleHeaderRename = () => {
    setIsEditingHeader(false);
    if (colName.trim() && colName.trim() !== column.name) {
      onRenameColumn(colName.trim());
    } else {
      setColName(column.name);
    }
  };

  return (
    <div className="flex flex-col w-[280px] sm:w-[310px] shrink-0 border border-border bg-surface rounded-sm shadow-sm font-sans" style={{ height: 'calc(100vh - 380px)', minHeight: '360px' }}>
      {/* Column Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-border bg-surface-hover/80 relative shrink-0">
        <div className="flex-1 mr-2 min-w-0">
          {isEditingHeader ? (
            <input
              type="text"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              onBlur={handleHeaderRename}
              onKeyDown={(e) => e.key === 'Enter' && handleHeaderRename()}
              className="w-full bg-input border border-border text-xs font-mono font-bold uppercase tracking-wider py-1 px-2 text-text-primary focus:outline-none focus:border-primary"
              autoFocus
            />
          ) : (
            <div className="flex items-center space-x-2">
              <h3
                onClick={() => canManageColumns && setIsEditingHeader(true)}
                className={`text-xs font-black uppercase tracking-wider text-text-primary truncate ${
                  canManageColumns ? 'cursor-pointer hover:text-primary transition-colors' : ''
                }`}
              >
                {column.name}
              </h3>
              <span className="font-mono text-[10px] bg-surface-active border border-border text-text-muted py-0.5 px-2 rounded-full font-bold">
                {tasks.length}
              </span>
            </div>
          )}
        </div>

        {/* Column Header Menu Button */}
        {canManageColumns && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-text-muted hover:text-text-primary p-1 rounded-sm hover:bg-surface-hover transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-surface-elevated border border-border shadow-theme-xl rounded-sm z-50 py-1 font-mono text-xs">
                <button
                  onClick={() => {
                    setIsEditingHeader(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-text-primary transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    onDeleteColumn();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-danger transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task list droppable container - fixed height with internal scroll */}
      <div ref={setNodeRef} className="flex-1 p-3 space-y-3 overflow-y-auto min-h-0">
        <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragDisabled={isDragDisabled}
              onClick={() => onTaskClick(task)}
              viewingUsers={taskPresence[task.id] || []}
            />
          ))}
        </SortableContext>

        {hiddenCount > 0 && onViewAllTasks && (
          <button
            onClick={() => onViewAllTasks(column, tasks)}
            className="w-full py-2 text-[11px] font-mono font-bold text-primary hover:text-primary-hover transition-colors flex items-center justify-center space-x-1 rounded-sm border border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10"
          >
            <span>View all {tasks.length} tasks</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Add Task Footer Button & Form */}
      <div className="p-3 border-t border-border bg-surface-hover/50 shrink-0">
        {isAdding ? (
          <form onSubmit={handleAddTaskSubmit} className="space-y-2">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="ENTER TASK TITLE..."
              className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={!taskTitle.trim() || isSubmittingTask}
                className="flex-1 bg-primary hover:bg-primary-hover disabled:bg-surface-active text-white text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 rounded-sm transition-colors flex items-center justify-center space-x-1"
              >
                {isSubmittingTask && <Spinner size="sm" />}
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={isSubmittingTask}
                className="flex-1 bg-surface-active hover:bg-surface-hover text-text-muted text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 border border-border rounded-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full border border-dashed border-border hover:border-primary hover:text-primary text-text-muted text-xs font-mono font-bold uppercase tracking-wider py-2 transition-all flex items-center justify-center space-x-1 rounded-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const BoardColumn = React.memo(BoardColumnComponent);
