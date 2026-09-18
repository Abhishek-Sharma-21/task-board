import React, { useState, useMemo } from 'react';
import { X, Search, ChevronLeft, ChevronRight, CheckCircle2, Calendar, User as UserIcon } from 'lucide-react';
import { parseLocalDate } from '../../utils/dates';
import type { Task, BoardColumn as ColumnType } from '../../schemas';

interface CompletedTasksDrawerProps {
  isOpen: boolean;
  column: ColumnType | null;
  tasks: Task[];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
  members?: { id: string; name: string }[];
}

const TASKS_PER_PAGE = 10;

const getPriorityBadgeStyle = (priority: string) => {
  switch (priority) {
    case 'Urgent':
      return 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50';
    case 'High':
      return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50';
    case 'Medium':
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50';
    default:
      return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';
  }
};

const getInitials = (name?: string) => {
  if (!name || !name.trim()) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
  return colors[Math.abs(hash) % colors.length];
};

const getDueDateString = (date?: Date | string) => {
  if (!date) return null;
  const dateStr = parseLocalDate(date);
  const [, m, d] = dateStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(m) - 1]} ${parseInt(d)}`;
};

export const CompletedTasksDrawer: React.FC<CompletedTasksDrawerProps> = ({
  isOpen,
  column,
  tasks,
  onClose,
  onTaskClick,
  members = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterLabel, setFilterLabel] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const allLabels = useMemo(() => {
    const labelSet = new Set<string>();
    tasks.forEach((t) => t.labels?.forEach((l) => labelSet.add(l)));
    return Array.from(labelSet);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchDesc) return false;
      }
      if (filterAssignee !== 'all' && !(task.assignees || []).some(a => a.id === filterAssignee)) return false;
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      if (filterLabel !== 'all' && !(task.labels || []).includes(filterLabel)) return false;
      return true;
    });
  }, [tasks, searchQuery, filterAssignee, filterPriority, filterLabel]);

  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * TASKS_PER_PAGE,
    currentPage * TASKS_PER_PAGE
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterAssignee('all');
    setFilterPriority('all');
    setFilterLabel('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterAssignee !== 'all' || filterPriority !== 'all' || filterLabel !== 'all';

  if (!isOpen || !column) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-surface-elevated border-l border-border shadow-theme-xl flex flex-col animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
              {column.name}
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight text-text-primary">
              ALL TASKS
            </h2>
            <p className="mt-1 text-xs text-text-muted font-mono">
              {filteredTasks.length} of {tasks.length} tasks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border bg-surface-hover/40 shrink-0">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search tasks..."
                className="w-full bg-input border border-border text-xs font-mono py-2 pl-9 pr-3 text-text-primary focus:outline-none focus:border-primary rounded-sm"
              />
            </div>

            {/* Assignee Filter */}
            <select
              value={filterAssignee}
              onChange={(e) => { setFilterAssignee(e.target.value); setCurrentPage(1); }}
              className="bg-input border border-border text-xs font-mono py-2 px-3 text-text-secondary focus:outline-none focus:border-primary rounded-sm"
            >
              <option value="all">All Assignees</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
              className="bg-input border border-border text-xs font-mono py-2 px-3 text-text-secondary focus:outline-none focus:border-primary rounded-sm"
            >
              <option value="all">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Label Filter */}
            {allLabels.length > 0 && (
              <select
                value={filterLabel}
                onChange={(e) => { setFilterLabel(e.target.value); setCurrentPage(1); }}
                className="bg-input border border-border text-xs font-mono py-2 px-3 text-text-secondary focus:outline-none focus:border-primary rounded-sm"
              >
                <option value="all">All Labels</option>
                {allLabels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-[10px] font-mono text-primary hover:text-primary-hover font-bold uppercase tracking-wider transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Task Table */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {paginatedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-text-faint mb-3" />
              <p className="text-sm font-bold text-text-muted">No tasks found</p>
              <p className="text-xs text-text-faint font-mono mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'No tasks in this column yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedTasks.map((task) => {
                const assignees = task.assignees || [];
                return (
                  <div
                    key={task.id}
                    onClick={() => { onTaskClick(task); onClose(); }}
                    className="flex items-center gap-4 p-4 hover:bg-surface-hover/60 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-text-primary truncate">{task.title}</h4>
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded-xs shrink-0 ${getPriorityBadgeStyle(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted">
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-text-faint" />
                            <span>{getDueDateString(task.dueDate)}</span>
                          </div>
                        )}
                        {assignees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-text-faint" />
                            <span>{assignees.map(a => a.name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {task.labels?.slice(0, 2).map((lbl) => (
                        <span
                          key={lbl}
                          className="bg-primary/10 border border-primary/20 text-primary font-mono text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                    {assignees.length > 0 && (
                      <div className="flex items-center -space-x-1.5">
                        {assignees.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            title={a.name}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-mono font-black shrink-0 border border-surface-elevated ${getAvatarBgColor(a.name)}`}
                          >
                            {getInitials(a.name)}
                          </div>
                        ))}
                        {assignees.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-surface-active border border-border flex items-center justify-center text-[9px] font-mono font-bold text-text-muted">
                            +{assignees.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border shrink-0 bg-surface-hover/40">
            <span className="text-[10px] font-mono text-text-muted">
              Showing {(currentPage - 1) * TASKS_PER_PAGE + 1}-{Math.min(currentPage * TASKS_PER_PAGE, filteredTasks.length)} of {filteredTasks.length}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 text-text-muted hover:text-text-primary border border-border rounded-sm disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-[10px] font-mono font-bold rounded-sm transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-white'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover border border-border'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 text-text-muted hover:text-text-primary border border-border rounded-sm disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
