import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useProjectStore } from './projectStore';
import { useProjectMemberStore } from './projectMemberStore';
import { useBoardStore } from '../boards/boardStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useAuthStore } from '../auth/authStore';
import { ProjectOverview } from './ProjectOverview';
import { TaskDrawer } from '../boards/TaskDrawer';
import { TaskWorkspaceModal } from '../boards/TaskWorkspaceModal';
import { useToastStore } from '../../components/common/toastStore';
import { useConfirmStore } from '../../components/common/confirmStore';
import type { Task } from '../../schemas';
import { LayoutGrid, List, Users, Settings } from 'lucide-react';

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const { setIsBoardModalOpen } = useOutletContext<{ setIsBoardModalOpen: (open: boolean) => void }>();
  
  const { activeProject, selectProject } = useProjectStore();
  const { members: projectMembers, fetchMembers, addMember, removeMember, setHead } = useProjectMemberStore();
  const { fetchBoards, boards, tasksByColumn, isLoading: boardsLoading } = useBoardStore();
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'boards' | 'calendar' | 'activity' | 'members' | 'settings'>('overview');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const { members: workspaceMembers } = useWorkspaceStore();
  const userMember = workspaceMembers.find((m) => m.id === user?.id);
  const userRole = userMember ? userMember.role : 'member';
  
  const projectMember = projectMembers.find((m) => m.id === user?.id);
  const canManageTeam = userRole === 'owner' || userRole === 'admin' || projectMember?.role === 'head';

  useEffect(() => {
    if (projectId) {
      selectProject(projectId);
      fetchMembers(projectId);
    }
  }, [projectId, selectProject, fetchMembers]);
  
  useEffect(() => {
    if (activeProject) {
      fetchBoards(activeProject.id);
    }
  }, [activeProject, fetchBoards]);

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !projectId) return;
    const wsMember = workspaceMembers.find((m) => m.email === addMemberEmail.trim());
    if (!wsMember) {
      useToastStore.getState().addToast({ message: 'User not found in this workspace', type: 'error' });
      return;
    }
    setAddingMember(true);
    try {
      await addMember(projectId, wsMember.id);
      setAddMemberEmail('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to add member';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return;
    const confirmed = await useConfirmStore.getState().open({
      title: 'Confirm',
      message: 'Remove this member from the project?',
      confirmLabel: 'Confirm',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await removeMember(projectId, userId);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to remove member';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    }
  };

  const handleSetHead = async (userId: string) => {
    if (!projectId) return;
    const confirmed = await useConfirmStore.getState().open({
      title: 'Confirm',
      message: 'Set this member as project head?',
      confirmLabel: 'Confirm',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await setHead(projectId, userId);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to set project head';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    }
  };

  const nonMemberWorkspaceMembers = workspaceMembers.filter(
    (wm) => !projectMembers.some((pm) => pm.id === wm.id)
  );

  const allProjectTasks = React.useMemo(() => {
    return Object.values(tasksByColumn).flat();
  }, [tasksByColumn]);

  if (boardsLoading && !activeProject) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest text-text-muted">
        Loading project...
      </div>
    );
  }
  
  if (!activeProject) {
    return (
      <div className="border-2 border-border bg-surface p-8 text-center rounded-sm">
        <h2 className="text-xl font-black uppercase text-text-primary tracking-tight">
          Project Not Found
        </h2>
        <p className="mt-2 text-sm text-text-muted font-medium">
          The project you're looking for doesn't exist or you don't have access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Tabbed Navigation Bar */}
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div className="flex items-center space-x-1 font-mono text-xs font-bold uppercase tracking-wider overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-4 rounded-sm transition-colors flex items-center gap-2 ${
              activeTab === 'overview' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('boards')}
            className={`py-2 px-4 rounded-sm transition-colors flex items-center gap-2 ${
              activeTab === 'boards' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            <List className="w-4 h-4" />
            Boards ({boards.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-4 rounded-sm transition-colors flex items-center gap-2 ${
              activeTab === 'members' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            <Users className="w-4 h-4" />
            Members ({projectMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-4 rounded-sm transition-colors flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <ProjectOverview
          project={activeProject}
          tasks={allProjectTasks}
          members={projectMembers.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role }))}
          canManage={canManageTeam}
          onOpenManageTeam={() => setActiveTab('members')}
          onOpenTaskDrawer={(t) => setSelectedTask(t)}
        />
      )}

      {activeTab === 'boards' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black uppercase text-text-primary">PROJECT BOARDS</h3>
            {userRole !== 'member' && (
              <button
                onClick={() => setIsBoardModalOpen(true)}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-mono font-bold uppercase py-2 px-4 rounded-sm transition-colors"
              >
                + New Board
              </button>
            )}
          </div>
          {boards.length === 0 ? (
            <div className="border border-dashed border-border p-8 text-center rounded-sm font-mono text-xs text-text-muted">
              No boards created in this project yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((b) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/workspaces/${activeProject.workspaceId}/projects/${activeProject.id}/boards/${b.id}`)}
                  className="bg-surface border border-border hover:border-primary p-4 rounded-sm cursor-pointer transition-colors space-y-2"
                >
                  <h4 className="text-sm font-black uppercase text-text-primary">{b.name}</h4>
                  {b.description && <p className="text-xs text-text-muted line-clamp-2">{b.description}</p>}
                  <span className="text-[10px] font-mono text-primary font-bold block pt-2">Open Board &rarr;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black uppercase text-text-primary">PROJECT MEMBERS</h3>
          </div>
          {canManageTeam && (
            <div className="mb-6 flex gap-2">
              <select
                value={addMemberEmail}
                onChange={(e) => setAddMemberEmail(e.target.value)}
                className="flex-1 bg-input border border-border text-xs font-bold text-text-secondary py-2 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
              >
                <option value="">SELECT WORKSPACE MEMBER...</option>
                {nonMemberWorkspaceMembers.map((wm) => (
                  <option key={wm.id} value={wm.email}>
                    {wm.name.toUpperCase()} ({wm.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addMemberEmail || addingMember}
                className="bg-primary hover:bg-primary-hover disabled:bg-surface-active disabled:text-text-faint text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-sm transition-colors"
              >
                {addingMember ? 'ADDING...' : 'ADD'}
              </button>
            </div>
          )}
          <div className="space-y-1 font-mono">
            {projectMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-md">
                <div>
                  <span className="font-bold text-text-primary text-sm">{member.name}</span>
                  <span className="text-text-muted text-xs ml-2">{member.email}</span>
                  {member.role === 'head' && (
                    <span className="ml-2 text-[9px] font-mono font-bold uppercase tracking-wider text-primary bg-primary-light px-2 py-0.5 rounded-sm">
                      HEAD
                    </span>
                  )}
                </div>
                {canManageTeam && member.id !== user?.id && (
                  <div className="flex gap-2">
                    {member.role !== 'head' && (
                      <button
                        onClick={() => handleSetHead(member.id)}
                        className="text-[9px] font-mono text-text-muted hover:text-primary uppercase tracking-wider transition-colors"
                      >
                        [SET HEAD]
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-[9px] font-mono text-text-muted hover:text-danger uppercase tracking-wider transition-colors"
                    >
                      [REMOVE]
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <h3 className="text-base font-black uppercase text-text-primary">PROJECT SETTINGS</h3>
          <div className="bg-surface border border-border p-4 rounded-sm">
            <p className="text-xs text-text-muted font-mono">
              Project settings will be available here.
            </p>
          </div>
        </div>
      )}

      {!isWorkspaceModalOpen && (
        <TaskDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onExpandWorkspace={() => setIsWorkspaceModalOpen(true)}
        />
      )}

      <TaskWorkspaceModal
        task={selectedTask}
        isOpen={isWorkspaceModalOpen}
        onClose={() => {
          setIsWorkspaceModalOpen(false);
          setSelectedTask(null);
        }}
        onMinimizeToDrawer={() => setIsWorkspaceModalOpen(false)}
      />
    </div>
  );
};