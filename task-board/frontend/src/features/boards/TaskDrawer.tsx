import React, { useEffect, useState } from 'react';
import { useBoardStore } from './boardStore';
import { useAuthStore } from '../auth/authStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useProjectMemberStore } from '../projects/projectMemberStore';
import { CommentSection } from '../comments/CommentSection';
import { Spinner } from '../../components/Spinner';
import type { Task } from '../../schemas';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ task, onClose }) => {
  const currentUser = useAuthStore((state) => state.user);
  const updateTask = useBoardStore((state) => state.updateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const workspaceMembers = useWorkspaceStore((state) => state.members);
  const { members: projectMembers, fetchMembers: fetchProjectMembers } = useProjectMemberStore();

  const userMember = workspaceMembers.find((m) => m.id === currentUser?.id);
  const userRole = userMember ? userMember.role : 'member';
  const canDeleteTask = userRole === 'owner' || userRole === 'admin';

  const projectMember = projectMembers.find((m) => m.id === currentUser?.id);
  const canAssign = userRole === 'owner' || userRole === 'admin' || (projectMember?.role === 'head');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [labelText, setLabelText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (description.trim() !== (task.description || '')) {
      handleFieldSave({ description: description.trim() });
    }
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as any;
    setPriority(val);
    handleFieldSave({ priority: val });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const finalVal = val === 'unassigned' ? null : val;
    setAssigneeId(finalVal);
    handleFieldSave({ assigneeId: finalVal });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDueDate(val);
    // Convert to ISO datetime or null
    const finalVal = val ? new Date(val).toISOString() : null;
    handleFieldSave({ dueDate: finalVal });
  };

  const handleAddLabel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelText.trim()) {
      e.preventDefault();
      const newLabel = labelText.trim();
      if (!task.labels.includes(newLabel)) {
        const updatedLabels = [...task.labels, newLabel];
        handleFieldSave({ labels: updatedLabels });
      }
      setLabelText('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const updatedLabels = task.labels.filter((l) => l !== labelToRemove);
    handleFieldSave({ labels: updatedLabels });
  };

  const handleDeleteTask = async () => {
    if (isDeleting) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-overlay backdrop-blur-xs z-40 transition-opacity"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-surface-elevated border-l-2 border-border z-50 shadow-theme-xl flex flex-col justify-between overflow-y-auto p-6 font-sans">
        {/* Close Button Header */}
        <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            TASK DETAILS (v{task.version})
          </span>
          <div className="flex items-center space-x-3">
            {canDeleteTask && (
              <button
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="text-[10px] font-mono text-danger hover:text-danger-hover hover:underline transition-colors uppercase tracking-wider mr-2 font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting && <Spinner className="text-danger" />}
                {isDeleting ? 'Deleting...' : '[Delete Task]'}
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
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescBlur}
              placeholder="ENTER WORK DESCRIPTION OR REQUIREMENTS..."
              className="w-full bg-input border-2 border-border rounded-sm py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-primary placeholder-text-faint resize-none leading-relaxed"
            />
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
      </div>
    </>
  );
};
