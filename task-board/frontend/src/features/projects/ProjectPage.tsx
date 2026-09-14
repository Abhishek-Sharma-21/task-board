import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useProjectStore } from './projectStore';
import { useProjectMemberStore } from './projectMemberStore';
import { useBoardStore } from '../boards/boardStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useAuthStore } from '../auth/authStore';
import { ProjectOverview } from './ProjectOverview';
import { ProjectCalendarView } from './ProjectCalendarView';
import { TaskDrawer } from '../boards/TaskDrawer';
import { TaskWorkspaceModal } from '../boards/TaskWorkspaceModal';
import { ActivityPage } from '../../pages/ActivityPage';
import type { Task } from '../../schemas';

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const { setIsBoardModalOpen } = useOutletContext<{ setIsBoardModalOpen: (open: boolean) => void }>();
  
  const { activeProject, selectProject } = useProjectStore();
  const { members: projectMembers, fetchMembers, addMember, removeMember, setHead } = useProjectMemberStore();
  const { fetchBoards, boards, tasksByColumn, isLoading: boardsLoading } = useBoardStore();
  const [showTeam, setShowTeam] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'boards' | 'calendar' | 'activity'>('overview');
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
      alert('User not found in this workspace');
      return;
    }
    setAddingMember(true);
    try {
      await addMember(projectId, wsMember.id);
      setAddMemberEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId || !window.confirm('Remove this member from the project?')) return;
    try {
      await removeMember(projectId, userId);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleSetHead = async (userId: string) => {
    if (!projectId || !window.confirm('Set this member as project head?')) return;
    try {
      await setHead(projectId, userId);
    } catch (err: any) {
      alert(err.message || 'Failed to set project head');
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

  if (showTeam) {
    return (
      <div className="p-6 max-w-2xl font-sans">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black uppercase text-text-primary">
            {activeProject.name} — Team
          </h1>
          <button
            onClick={() => setShowTeam(false)}
            className="bg-surface-active hover:bg-surface-hover text-text-primary font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-sm transition-colors"
          >
            Back to Overview
          </button>
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
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Tabbed Navigation Bar */}
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div className="flex items-center space-x-1 font-mono text-xs font-bold uppercase tracking-wider overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-4 rounded-sm transition-colors ${
              activeTab === 'overview' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('boards')}
            className={`py-2 px-4 rounded-sm transition-colors ${
              activeTab === 'boards' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            Boards ({boards.length})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-4 rounded-sm transition-colors ${
              activeTab === 'calendar' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-4 rounded-sm transition-colors ${
              activeTab === 'activity' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary bg-surface'
            }`}
          >
            Activity History
          </button>
        </div>

        <button
          onClick={() => setShowTeam(true)}
          className="text-xs font-mono font-bold text-primary hover:text-primary-hover uppercase tracking-wider"
        >
          Team ({projectMembers.length}) &rarr;
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <ProjectOverview
          project={activeProject}
          tasks={allProjectTasks}
          members={projectMembers.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role }))}
          canManage={canManageTeam}
          onOpenManageTeam={() => setShowTeam(true)}
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

      {activeTab === 'calendar' && (
        <ProjectCalendarView tasks={allProjectTasks} />
      )}

      {activeTab === 'activity' && (
        <ActivityPage />
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