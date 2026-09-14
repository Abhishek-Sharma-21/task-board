import React, { useState, useEffect } from 'react';
import type { Task } from '../../schemas';
import { useBoardStore } from './boardStore';
import { useAuthStore } from '../auth/authStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useProjectMemberStore } from '../projects/projectMemberStore';
import { TaskChatView } from '../chat/TaskChatView';
import { CommentSection } from '../comments/CommentSection';
import { useActivityStore, Activity } from '../activities/activityStore';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface TaskWorkspaceModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onMinimizeToDrawer: () => void;
}

export const TaskWorkspaceModal: React.FC<TaskWorkspaceModalProps> = ({
  task,
  isOpen,
  onClose,
  onMinimizeToDrawer,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const updateTask = useBoardStore((state) => state.updateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const archiveTask = useBoardStore((state) => state.archiveTask);
  const duplicateTask = useBoardStore((state) => state.duplicateTask);
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
  const canAssign = userRole === 'owner' || userRole === 'admin' || projectMember?.role === 'head';

  const [mobileTab, setMobileTab] = useState<'details' | 'chat' | 'history'>('details');
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

  // Sync state with active task
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority as any);
      setAssigneeId(task.assigneeId || null);
      fetchProjectMembers(task.projectId);
      if (task.dueDate) {
        const dateObj = new Date(task.dueDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setDueDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setDueDate('');
      }
    }
  }, [task, fetchProjectMembers]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (mobileTab === 'history' && task) {
      setLoadingHistory(true);
      fetchTaskHistory(task.id).then((history) => {
        setTaskHistory(history);
        setLoadingHistory(false);
      });
    }
  }, [mobileTab, task, fetchTaskHistory]);

  if (!isOpen || !task) return null;

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

  const handleDuplicate = async () => {
    try {
      await duplicateTask(task.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate task');
    }
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
        className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 transition-opacity"
      />

      {/* Centered Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none">
        <div className="pointer-events-auto bg-surface-elevated border-2 border-border shadow-theme-xl rounded-sm w-full max-w-[1100px] h-full max-h-[750px] flex flex-col font-sans overflow-hidden">
          {/* Header Bar */}
          <div className="bg-surface-hover border-b border-border p-3 sm:p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-3 truncate">
              <span className="text-[9px] uppercase font-mono tracking-widest bg-primary-light text-primary font-bold px-2 py-0.5 rounded-sm shrink-0">
                TASK WORKSPACE
              </span>
              <h2 className="text-sm sm:text-base font-black uppercase text-text-primary tracking-tight truncate">
                {task.title}
              </h2>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleDuplicate}
                className="text-[10px] font-mono text-text-muted hover:text-text-primary font-bold uppercase tracking-wider px-2 py-1 bg-surface border border-border rounded-sm hidden sm:inline-block"
              >
                Duplicate
              </button>
              <button
                onClick={handleToggleArchive}
                className="text-[10px] font-mono text-primary hover:text-primary-hover font-bold uppercase tracking-wider px-2 py-1 bg-surface border border-border rounded-sm hidden sm:inline-block"
              >
                {task.isArchived ? 'Restore' : 'Archive'}
              </button>
              {canDeleteTask && (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={isDeleting}
                  className="text-[10px] font-mono text-danger hover:text-danger-hover transition-colors uppercase tracking-wider font-bold hidden sm:inline-block disabled:opacity-50"
                >
                  [Delete]
                </button>
              )}

              {/* Minimize / Collapse to Right Drawer */}
              <button
                onClick={onMinimizeToDrawer}
                className="text-[10px] font-mono text-text-muted hover:text-primary font-bold uppercase tracking-wider px-2.5 py-1 bg-surface border border-border rounded-sm transition-colors"
                title="Minimize to Right Drawer"
              >
                Drawer Mode ↘
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary font-mono text-sm px-1.5 font-bold"
                aria-label="Close Modal"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mobile Tab Switcher (visible on < md screens) */}
          <div className="flex md:hidden border-b border-border bg-surface font-mono text-xs font-bold uppercase tracking-wider shrink-0">
            <button
              onClick={() => setMobileTab('details')}
              className={`flex-1 py-2 text-center transition-colors ${
                mobileTab === 'details' ? 'bg-primary text-white' : 'text-text-muted'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setMobileTab('chat')}
              className={`flex-1 py-2 text-center transition-colors ${
                mobileTab === 'chat' ? 'bg-primary text-white' : 'text-text-muted'
              }`}
            >
              Task Chat 💬
            </button>
            <button
              onClick={() => setMobileTab('history')}
              className={`flex-1 py-2 text-center transition-colors ${
                mobileTab === 'history' ? 'bg-primary text-white' : 'text-text-muted'
              }`}
            >
              History
            </button>
          </div>

          {/* Modal Split Body */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Panel: Task Details (Visible on Desktop OR Mobile 'details' / 'history' tab) */}
            <div
              className={`md:w-1/2 border-r border-border overflow-y-auto p-4 sm:p-6 space-y-6 ${
                mobileTab === 'chat' ? 'hidden md:block' : 'block'
              }`}
            >
              {mobileTab === 'history' ? (
                <div className="space-y-4 font-mono text-xs">
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
                <>
                  {/* Title */}
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
                      className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-border focus:border-primary text-base sm:text-lg font-black uppercase text-text-primary py-1 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Priority & Assignee Grid */}
                  <div className="grid grid-cols-2 gap-4">
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
                          .filter((member) => member && member.name != null)
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name.toUpperCase()} {member.role === 'head' ? '(HEAD)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Due Date */}
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

                  {/* Description */}
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

                  {/* Checklists */}
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

                  {/* Tags */}
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

                  {/* Comments Feed */}
                  <CommentSection taskId={task.id} />
                </>
              )}
            </div>

            {/* Right Panel: Task Chat (Visible on Desktop OR Mobile 'chat' tab) */}
            <div
              className={`md:w-1/2 flex-1 h-full min-h-0 ${
                mobileTab === 'chat' || mobileTab === undefined ? 'block' : 'hidden md:block'
              }`}
            >
              <TaskChatView task={task} isExpanded={true} />
            </div>
          </div>
        </div>
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
