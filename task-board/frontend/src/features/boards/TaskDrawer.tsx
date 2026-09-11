import React, { useEffect, useState } from 'react';
import { useBoardStore } from './boardStore';
import { useAuthStore } from '../auth/authStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useProjectMemberStore } from '../projects/projectMemberStore';
import { CommentSection } from '../comments/CommentSection';
import { useActivityStore, Activity } from '../activities/activityStore';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import type { Task } from '../../schemas';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ task, onClose }) => {
  const currentUser = useAuthStore((state) => state.user);
  const updateTask = useBoardStore((state) => state.updateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const archiveTask = useBoardStore((state) => state.archiveTask);
  const addChecklistItem = useBoardStore((state) => state.addChecklistItem);
  const toggleChecklistItem = useBoardStore((state) => state.toggleChecklistItem);
  const deleteChecklistItem = useBoardStore((state) => state.deleteChecklistItem);

  const workspaceMembers = useWorkspaceStore((state) => state.members);
  const { members: projectMembers, fetchMembers: fetchProjectMembers } = useProjectMemberStore();
  const fetchTaskHistory = useActivityStore((state) => state.fetchTaskHistory);

  const userMember = workspaceMembers.find((m) => m.id === currentUser?.id);
  const userRole = userMember ? userMember.role : 'member';
  const canDeleteTask = userRole === 'owner' || userRole === 'admin';

  const projectMember = projectMembers.find((m) => m.id === currentUser?.id);
  const canAssign = userRole === 'owner' || userRole === 'admin' || (projectMember?.role === 'head');

  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [taskHistory, setTaskHistory] = useState<Activity[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [labelText, setLabelText] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Sync state with selected task
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority as any);
      setAssigneeId(task.assigneeId || null);
      fetchProjectMembers(task.projectId);
      if (task.dueDate) {
        // Format to YYYY-MM-DD for native HTML date input
        const dateObj = new Date(task.dueDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setDueDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setDueDate('');
      }
    }
  }, [task]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (activeTab === 'history' && task) {
      setLoadingHistory(true);
      fetchTaskHistory(task.id).then((history) => {
        setTaskHistory(history);
        setLoadingHistory(false);
      });
    }
  }, [activeTab, task, fetchTaskHistory]);

  if (!task) return null;

  const handleFieldSave = async (updates: any) => {
    try {
      await updateTask(task.id, {
        ...updates,
        expectedVersion: task.version,
      });
    } catch (err) {
      // Handled
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== task.title) {
      handleFieldSave({ title: title.trim() });
    } else {
      setTitle(task.title);
    }
  };

  const handleDescBlur = () => {
    if (description !== task.description) {
      handleFieldSave({ description });
    }
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent';
    setPriority(val);
    handleFieldSave({ priority: val });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === 'unassigned' ? null : e.target.value;
    setAssigneeId(val);
    handleFieldSave({ assigneeId: val });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDueDate(val);
    handleFieldSave({ dueDate: val ? val : null });
  };

  const handleAddLabel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelText.trim()) {
      e.preventDefault();
      const newLabel = labelText.trim().toUpperCase();
      if (!task.labels.includes(newLabel)) {
        const newLabels = [...task.labels, newLabel];
        handleFieldSave({ labels: newLabels });
      }
      setLabelText('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const newLabels = task.labels.filter((l) => l !== labelToRemove);
    handleFieldSave({ labels: newLabels });
  };

  const handleToggleArchive = async () => {
    await archiveTask(task.id, !task.isArchived);
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newChecklistText.trim()) {
      await addChecklistItem(task.id, newChecklistText.trim());
      setNewChecklistText('');
    }
  };

  const handleDeleteTaskConfirmed = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      setShowConfirmDelete(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const checklists = task.checklists || [];
  const completedChecklists = checklists.filter((c) => c.completed).length;
  const checklistPercentage = checklists.length > 0 ? Math.round((completedChecklists / checklists.length) * 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-overlay backdrop-blur-xs z-40 transition-opacity"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-lg bg-surface-elevated border-l-2 border-border z-50 shadow-theme-xl flex flex-col justify-between overflow-y-auto p-4 sm:p-6 font-sans">
        {/* Close Button Header */}
        <div className="flex justify-between items-center border-b border-border pb-4 mb-6 gap-2">
          <div className="flex items-center space-x-2 font-mono text-[10px] font-bold uppercase tracking-wider overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-1 px-2 rounded-sm ${activeTab === 'details' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1 px-2 rounded-sm ${activeTab === 'history' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              Task History
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleArchive}
              className="text-[10px] font-mono text-primary hover:text-primary-hover font-bold uppercase tracking-wider px-2 py-1 bg-surface border border-border rounded-sm"
            >
              {task.isArchived ? 'Restore Task' : 'Archive Task'}
            </button>
            {canDeleteTask && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={isDeleting}
                className="text-[10px] font-mono text-danger hover:text-danger-hover transition-colors uppercase tracking-wider font-bold flex items-center gap-1 disabled:opacity-50"
              >
                [Delete]
              </button>
            )}
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer Body content */}
        {activeTab === 'history' ? (
          <div className="flex-1 space-y-4 font-mono text-xs">
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block">
              TASK AUDIT LOG & HISTORY
            </span>
            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-text-muted">Loading history...</div>
            ) : taskHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted italic border border-dashed border-border p-4 rounded-sm">
                No activity records for this task.
              </div>
            ) : (
              <div className="space-y-3">
                {taskHistory.map((h) => (
                  <div key={h.id} className="border border-border bg-surface-hover p-3 rounded-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-text-primary">{h.action}</span>
                      <span className="text-[9px] text-text-muted">{new Date(h.createdAt).toLocaleTimeString()}</span>
                    </div>
                    {h.description && <p className="text-[11px] text-text-secondary mt-1">{h.description}</p>}
                    {h.user && <span className="text-[9px] text-text-muted block mt-1">By: {h.user.name}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="flex-1 space-y-6">
          {/* Editable Title */}
          <div>
            <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
              className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-border focus:border-primary text-lg font-black uppercase text-text-primary py-1 focus:outline-none transition-colors"
            />
          </div>

          {/* Inline Select Fields (Priority + Assignee) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority Selector */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={handlePriorityChange}
                className="w-full bg-input border border-border text-xs font-bold text-text-secondary py-2 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Assignee Selector */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
                Assignee {!canAssign && <span className="text-text-faint">(read-only)</span>}
              </label>
              <select
                value={assigneeId || 'unassigned'}
                onChange={handleAssigneeChange}
                disabled={!canAssign}
                className="w-full bg-input border border-border text-xs font-bold text-text-secondary py-2 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="unassigned">UNASSIGNED</option>
                {projectMembers
                  .filter(member => member && member.name != null)
                  .map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name.toUpperCase()} {member.role === 'head' ? '(HEAD)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={handleDueDateChange}
              className="bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm w-full uppercase"
            />
          </div>

          {/* Editable Description */}
          <div>
            <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescBlur}
              placeholder="ENTER WORK DESCRIPTION OR REQUIREMENTS..."
              className="w-full bg-input border-2 border-border rounded-sm py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-primary placeholder-text-faint resize-none leading-relaxed"
            />
          </div>

          {/* Checklist Subtasks */}
          <div className="space-y-3 bg-surface border border-border p-4 rounded-sm">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-text-primary">
                Subtasks / Checklist ({completedChecklists}/{checklists.length})
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">{checklistPercentage}%</span>
            </div>

            {checklists.length > 0 && (
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-success h-full transition-all duration-200" style={{ width: `${checklistPercentage}%` }}></div>
              </div>
            )}

            <div className="space-y-2">
              {checklists.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-xs font-mono">
                  <label className="flex items-center space-x-2 cursor-pointer min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
                      className="rounded-xs text-primary focus:ring-0 cursor-pointer"
                    />
                    <span className={`break-words min-w-0 ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                      {item.title}
                    </span>
                  </label>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="text-text-muted hover:text-danger font-bold text-sm px-1"
                    title="Delete subtask"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddChecklist} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="+ Add checklist item..."
                className="flex-1 bg-input border border-border text-xs font-mono py-1.5 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-white text-xs font-mono font-bold uppercase rounded-sm hover:bg-primary-hover transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Labels Manager */}
          <div>
            <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1.5">
              Tags / Labels
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {task.labels.map((lbl) => (
                <span
                  key={lbl}
                  className="bg-tag border border-tag-border text-tag-text font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm flex items-center space-x-1"
                >
                  <span>{lbl}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(lbl)}
                    className="text-text-muted hover:text-primary font-bold ml-1"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onKeyDown={handleAddLabel}
              placeholder="TYPE TAG & PRESS ENTER..."
              className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm"
            />
          </div>

          {/* Discussion section */}
          <CommentSection taskId={task.id} />
        </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to permanently delete task "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        isLoading={isDeleting}
        onConfirm={handleDeleteTaskConfirmed}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
};
