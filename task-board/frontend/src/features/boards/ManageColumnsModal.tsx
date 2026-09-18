import React, { useState } from 'react';
import type { BoardColumn as ColumnType } from '../../schemas';
import { GripVertical, X, Plus, Trash2 } from 'lucide-react';
import { Spinner } from '../../components/Spinner';

interface ManageColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnType[];
  hiddenColumnIds: string[];
  tasksByColumn?: Record<string, any[]>;
  onToggleVisibility: (columnId: string) => void;
  onAddColumn: (name: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  canManageColumns?: boolean;
}

export const ManageColumnsModal: React.FC<ManageColumnsModalProps> = ({
  isOpen,
  onClose,
  columns,
  hiddenColumnIds,
  tasksByColumn = {},
  onToggleVisibility,
  onAddColumn,
  onDeleteColumn,
  canManageColumns = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddColumn(newColName.trim());
      setNewColName('');
      setIsAdding(false);
    } catch (err) {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-overlay backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-elevated border-2 border-border shadow-theme-xl rounded-sm w-full max-w-sm p-4 sm:p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-black uppercase text-text-primary tracking-tight">
            Manage Columns
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Columns List */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {columns.map((col) => {
            const isVisible = !hiddenColumnIds.includes(col.id);
            const taskCount = tasksByColumn[col.id]?.length ?? 0;

            return (
              <div
                key={col.id}
                className="flex items-center justify-between p-2.5 border border-border bg-surface hover:bg-surface-hover rounded-sm transition-colors font-mono text-xs"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <GripVertical className="w-4 h-4 text-text-muted shrink-0 cursor-grab" />
                  <span className="font-bold text-text-primary truncate">{col.name}</span>
                  <span className="text-[10px] bg-surface-active text-text-muted font-bold px-2 py-0.5 rounded-full shrink-0">
                    {taskCount}
                  </span>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {/* Visibility Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(col.id)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors focus:outline-none ${
                      isVisible ? 'bg-primary justify-end' : 'bg-border justify-start'
                    }`}
                    title={isVisible ? 'Hide Column' : 'Show Column'}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-sm inline-block"></span>
                  </button>

                  {/* Delete Column (if allowed) */}
                  {canManageColumns && (
                    <button
                      onClick={() => onDeleteColumn(col.id)}
                      className="text-text-muted hover:text-danger transition-colors p-1"
                      title="Delete Column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Column Section */}
        {canManageColumns && (
          <div className="pt-2 border-t border-border">
            {isAdding ? (
              <form onSubmit={handleAddSubmit} className="space-y-2">
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="COLUMN NAME..."
                  className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm uppercase"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={!newColName.trim() || isSubmitting}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white text-[10px] font-mono font-bold uppercase py-1.5 rounded-sm transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
                  >
                    {isSubmitting && <Spinner size="sm" />}
                    <span>Save Column</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    disabled={isSubmitting}
                    className="px-3 bg-surface-active hover:bg-surface-hover text-text-muted text-[10px] font-mono font-bold uppercase py-1.5 border border-border rounded-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full border border-dashed border-border hover:border-primary text-primary text-xs font-mono font-bold uppercase py-2 rounded-sm transition-colors flex items-center justify-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Column</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
