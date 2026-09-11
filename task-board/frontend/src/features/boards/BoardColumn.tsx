import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Spinner } from '../../components/Spinner';
import type { BoardColumn as ColumnType, Task } from '../../schemas';

interface BoardColumnProps {
  column: ColumnType;
  tasks: Task[];
  canManageColumns?: boolean;
  isDragDisabled?: boolean;
  onAddTask: (title: string) => Promise<void>;
  onDeleteColumn: () => void;
  onRenameColumn: (name: string) => void;
  onTaskClick: (task: Task) => void;
}

const BoardColumnComponent: React.FC<BoardColumnProps> = ({
  column,
  tasks,
  canManageColumns = false,
  isDragDisabled = false,
  onAddTask,
  onDeleteColumn,
  onRenameColumn,
  onTaskClick,
}) => {
  const { setNodeRef } = useDroppable({ id: column.id });

  const [isAdding, setIsAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [colName, setColName] = useState(column.name);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

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
    <div className="flex flex-col w-[280px] sm:w-[300px] shrink-0 border-2 border-border bg-kanban-column min-h-[500px] rounded-sm">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b-2 border-border bg-surface-hover">
        <div className="flex-1 mr-2">
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
                className={`text-xs font-black uppercase tracking-wider text-text-secondary ${canManageColumns ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
              >
                {column.name}
              </h3>
              <span className="font-mono text-[9px] bg-surface-active text-text-muted py-0.5 px-2 rounded-full font-bold">
                {tasks.length}
              </span>
            </div>
          )}
        </div>

        {/* Delete Column button */}
        {canManageColumns && (
          <button
            onClick={onDeleteColumn}
            className="text-text-muted hover:text-primary transition-colors"
            title="Delete column"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Task list droppable container */}
      <div ref={setNodeRef} className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[70vh]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragDisabled={isDragDisabled}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Task Button & Form Footer */}
      <div className="p-3 border-t border-border bg-surface-hover">
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
                className="flex-1 bg-primary hover:bg-primary-hover disabled:bg-surface-active text-white text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-sm transition-colors flex items-center justify-center space-x-1"
              >
                {isSubmittingTask && <Spinner size="sm" />}
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={isSubmittingTask}
                className="flex-1 bg-surface-active hover:bg-surface-hover text-text-muted text-[10px] font-bold uppercase tracking-wider py-1.5 border border-border rounded-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full border border-dashed border-border hover:border-border-strong hover:text-text-primary text-text-muted text-xs font-mono uppercase tracking-wider py-2 transition-all flex items-center justify-center space-x-1.5"
          >
            <span>+</span>
            <span>Add Task</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const BoardColumn = React.memo(BoardColumnComponent);
