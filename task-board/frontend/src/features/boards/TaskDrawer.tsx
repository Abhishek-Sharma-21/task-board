import React, { useEffect, useState, useRef } from 'react';
import { useBoardStore } from './boardStore';
import { useAuthStore } from '../auth/authStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useProjectMemberStore } from '../projects/projectMemberStore';
import { CommentSection } from '../comments/CommentSection';
import { useActivityStore, Activity } from '../activities/activityStore';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useToastStore } from '../../components/common/toastStore';
import { TaskChatView } from '../chat/TaskChatView';
import { api } from '../../api/client';
import type { Task } from '../../schemas';
import { MoreHorizontal, Copy, Archive, Trash2, MessageSquare, History, CheckCircle2, AlertTriangle, Clock, RotateCcw, X } from 'lucide-react';
import { parseLocalDate } from '../../utils/dates';
import { RichTextEditor } from '../../components/RichTextEditor';
import { getSocket } from '../../sockets/socket';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onExpandWorkspace?: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ task, onClose, onExpandWorkspace }) => {
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
  const canAssign = userRole === 'owner' || userRole === 'admin' || (projectMember?.role === 'head');

  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'history'>('details');
  const [taskHistory, setTaskHistory] = useState<Activity[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelText, setLabelText] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const lastSyncedTaskIdRef = useRef<string | null>(null);

  const currentDueDate = task?.dueDate ? parseLocalDate(task.dueDate) : '';
  const isDirty = Boolean(
    task &&
      (title.trim() !== task.title ||
        description !== (task.description || '') ||
        priority !== task.priority ||
        JSON.stringify(assigneeIds) !== JSON.stringify((task.assignees || []).map(a => a.id)) ||
        dueDate !== currentDueDate ||
        JSON.stringify(labels) !== JSON.stringify(task.labels || []))
  );

  // Sync state with selected task when task ID changes or when not dirty
  useEffect(() => {
    if (task) {
      const isNewTask = lastSyncedTaskIdRef.current !== task.id;
      if (isNewTask || !isDirty) {
        setTitle(task.title);
        setDescription(task.description || '');
        setPriority(task.priority as any);
        setAssigneeIds((task.assignees || []).map(a => a.id));
        setDueDate(task.dueDate ? parseLocalDate(task.dueDate) : '');
        setLabels(task.labels || []);
        lastSyncedTaskIdRef.current = task.id;
      }
      fetchProjectMembers(task.projectId);

      // Emit task presence (joinTask)
      if (currentUser?.name) {
        const socket = getSocket();
        if (lastSyncedTaskIdRef.current && lastSyncedTaskIdRef.current !== task.id) {
          socket.emit('leaveTask', { taskId: lastSyncedTaskIdRef.current, boardId: task.boardId });
        }
        socket.emit('joinTask', { taskId: task.id, boardId: task.boardId, name: currentUser.name });
      }
    }
  }, [task, fetchProjectMembers, isDirty, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Leave task presence before closing
        if (task && currentUser?.name) {
          getSocket().emit('leaveTask', { taskId: task.id, boardId: task.boardId });
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, task, currentUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    if (showOverflowMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOverflowMenu]);

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

  const handleSaveChanges = async () => {
    if (!task || !isDirty || isSaving || !title.trim()) return;
    setIsSaving(true);

    const payload = {
      title: title.trim(),
      description,
      priority,
      assigneeIds,
      dueDate: dueDate ? dueDate : null,
      labels,
    };

    try {
      await updateTask(task.id, { ...payload, expectedVersion: task.version });
    } catch (err: any) {
      if (err.response?.data?.errorCode === 'VERSION_CONFLICT') {
        try {
          const { data } = await api.get<{ success: boolean; data: Task }>(`/tasks/${task.id}`);
          const freshTask = data.data;
          await updateTask(task.id, { ...payload, expectedVersion: freshTask.version });
        } catch {
          useToastStore.getState().addToast({ message: 'Task was updated by someone else. Please refresh.', type: 'error' });
        }
      } else {
        const msg = err.response?.data?.message || err.message || 'Failed to save task changes';
        useToastStore.getState().addToast({ message: msg, type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority as any);
    setAssigneeIds((task.assignees || []).map(a => a.id));
    setDueDate(task.dueDate ? parseLocalDate(task.dueDate) : '');
    setLabels(task.labels || []);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriority(e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent');
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDueDate(e.target.value);
  };

  const handleAddLabel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelText.trim()) {
      e.preventDefault();
      const newLabel = labelText.trim().toUpperCase();
      if (!labels.includes(newLabel)) {
        setLabels([...labels, newLabel]);
      }
      setLabelText('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  const handleToggleArchive = async () => {
    await archiveTask(task.id, !task.isArchived);
  };

  const handleDuplicateTask = async () => {
    try {
      await duplicateTask(task.id);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to duplicate task';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
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
      const msg = err.response?.data?.message || err.message || 'Failed to delete task';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const checklists = task.checklists || [];
  const completedChecklists = checklists.filter((c) => c.completed).length;
  const checklistPercentage = checklists.length > 0 ? Math.round((completedChecklists / checklists.length) * 100) : 0;

  const getTaskHealth = () => {
    const now = new Date();
    const isOverdue = task.dueDate && new Date(task.dueDate) < now;
    const isHighPriority = task.priority === 'High' || task.priority === 'Urgent';
    const hasChecklist = checklists.length > 0;
    const allChecklistsComplete = hasChecklist && completedChecklists === checklists.length;

    if (isOverdue && isHighPriority) {
      return { status: 'critical', icon: AlertTriangle, label: 'Overdue & High Priority', color: 'text-danger' };
    }
    if (isOverdue) {
      return { status: 'overdue', icon: Clock, label: 'Overdue', color: 'text-danger' };
    }
    if (allChecklistsComplete) {
      return { status: 'complete', icon: CheckCircle2, label: 'All Subtasks Done', color: 'text-success' };
    }
    if (checklistPercentage > 0) {
      return { status: 'progress', icon: Clock, label: `${checklistPercentage}% Complete`, color: 'text-primary' };
    }
    if (isHighPriority) {
      return { status: 'high', icon: AlertTriangle, label: 'High Priority', color: 'text-warning' };
    }
    return { status: 'ok', icon: CheckCircle2, label: 'On Track', color: 'text-success' };
  };

  const taskHealth = getTaskHealth();

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
              className={`py-1 px-2 rounded-sm flex items-center gap-1 ${activeTab === 'details' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-1 px-2 rounded-sm flex items-center gap-1 ${activeTab === 'chat' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              <MessageSquare className="w-3 h-3" />
              Discussion
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1 px-2 rounded-sm flex items-center gap-1 ${activeTab === 'history' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              <History className="w-3 h-3" />
              Activity
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {onExpandWorkspace && (
              <button
                onClick={onExpandWorkspace}
                className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider px-2 py-1 bg-primary-light border border-primary/30 rounded-sm hover:bg-primary hover:text-white transition-colors"
                title="Expand into Centered Split Workspace"
              >
                Expand ↗
              </button>
            )}
            
            {/* Overflow Menu */}
            <div className="relative" ref={overflowMenuRef}>
              <button
                onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-sm hover:bg-surface-hover"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              
              {showOverflowMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-surface-elevated border border-border rounded-sm shadow-theme-xl z-50 py-1">
                  <button
                    onClick={() => {
                      handleDuplicateTask();
                      setShowOverflowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      handleToggleArchive();
                      setShowOverflowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors"
                  >
                    {task.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    {task.isArchived ? 'Restore Task' : 'Archive Task'}
                  </button>
                  {canDeleteTask && (
                    <button
                      onClick={() => {
                        setShowConfirmDelete(true);
                        setShowOverflowMenu(false);
                      }}
                      disabled={isDeleting}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-danger hover:bg-surface-hover flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body content */}
        {activeTab === 'chat' ? (
          <div className="flex-1 h-[520px]">
            <TaskChatView task={task} onExpand={onExpandWorkspace} />
          </div>
        ) : activeTab === 'history' ? (
          <div className="flex-1 space-y-4 font-mono text-xs">
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block">
              ACTIVITY LOG
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
          {/* Unsaved Changes Banner */}
          {isDirty && (
            <div className="bg-primary-light border-2 border-primary/40 p-3 rounded-sm flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                  Unsaved Draft Changes
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                  className="px-2.5 py-1 text-xs font-mono font-bold uppercase border border-border bg-surface text-text-secondary hover:text-text-primary rounded-sm transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving || !title.trim()}
                  className="px-3 py-1 text-xs font-mono font-bold uppercase bg-primary hover:bg-primary-hover text-white rounded-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Task Health Indicator */}
          <div className={`flex items-center gap-2 p-3 rounded-sm border ${
            taskHealth.status === 'critical' ? 'bg-danger/10 border-danger/30' :
            taskHealth.status === 'overdue' ? 'bg-danger/5 border-danger/20' :
            taskHealth.status === 'complete' ? 'bg-success/10 border-success/30' :
            taskHealth.status === 'high' ? 'bg-warning/10 border-warning/30' :
            'bg-surface border-border'
          }`}>
            <taskHealth.icon className={`w-5 h-5 ${taskHealth.color}`} />
            <span className={`text-xs font-mono font-bold uppercase tracking-wider ${taskHealth.color}`}>
              {taskHealth.label}
            </span>
          </div>

          {/* Editable Title */}
          <div>
            <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-border focus:border-primary text-lg font-black uppercase text-text-primary py-1 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Inline Select Fields (Priority + Assignee) */}
          <div className="space-y-4">
            {/* Priority Selector */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={handlePriorityChange}
                disabled={isSaving}
                className="w-full bg-input border border-border text-xs font-bold text-text-secondary py-2 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Assignee Multi-Select */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
                Assignees {!canAssign && <span className="text-text-faint">(read-only)</span>}
              </label>
              <div className="border border-border rounded-sm max-h-40 overflow-y-auto bg-input">
                {projectMembers
                  .filter(member => member && member.name != null)
                  .map(member => (
                    <label key={member.id} className="flex items-center space-x-2 px-3 py-1.5 hover:bg-surface-hover cursor-pointer border-b border-border-subtle last:border-b-0">
                      <input
                        type="checkbox"
                        checked={assigneeIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssigneeIds([...assigneeIds, member.id]);
                          } else {
                            setAssigneeIds(assigneeIds.filter(id => id !== member.id));
                          }
                        }}
                        disabled={!canAssign || isSaving}
                        className="rounded-xs text-primary focus:ring-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs font-bold text-text-secondary">
                        {member.name} {member.role === 'head' ? '(HEAD)' : ''}
                      </span>
                    </label>
                  ))}
              </div>
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
              disabled={isSaving}
              className="bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm w-full uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Editable Description */}
          <div>
            <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">
              Description
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="ENTER WORK DESCRIPTION OR REQUIREMENTS..."
              disabled={isSaving}
              minRows={3}
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
                disabled={isSaving}
                className="flex-1 bg-input border border-border text-xs font-mono py-1.5 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-3 py-1.5 bg-primary text-white text-xs font-mono font-bold uppercase rounded-sm hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              {labels.map((lbl) => (
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
              disabled={isSaving}
              className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
