import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useProjectStore } from './projectStore';
import { useProjectMemberStore } from './projectMemberStore';
import { useBoardStore } from '../boards/boardStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useAuthStore } from '../auth/authStore';


export const ProjectPage: React.FC = () => {
  const { projectId, workspaceId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const { setIsBoardModalOpen } = useOutletContext<{ setIsBoardModalOpen: (open: boolean) => void }>();
  
  const { activeProject, selectProject } = useProjectStore();
  const { members: projectMembers, fetchMembers, addMember, removeMember, setHead } = useProjectMemberStore();
  const { fetchBoards, boards, isLoading: boardsLoading } = useBoardStore();
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = React.useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

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
  
  useEffect(() => {
    if (hasAttemptedRedirect) return;
    const pathname = window.location.pathname;
    const hasBoardInPath = pathname.includes('/boards/');
    
    if (activeProject && boards.length > 0 && !hasBoardInPath) {
      setHasAttemptedRedirect(true);
      navigate(`/workspaces/${activeProject.workspaceId}/projects/${activeProject.id}/boards/${boards[0].id}`, { replace: true });
    }
  }, [activeProject, boards, navigate, hasAttemptedRedirect]);
  
  useEffect(() => {
    setHasAttemptedRedirect(false);
  }, [workspaceId, projectId]);

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
  
  if (boardsLoading && boards.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest text-text-muted">
        Loading boards...
      </div>
    );
  }

  if (showTeam) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black uppercase text-text-primary">
            {activeProject.name} — Team
          </h1>
          <button
            onClick={() => setShowTeam(false)}
            className="bg-surface-active hover:bg-surface-hover text-text-primary font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-sm transition-colors"
          >
            Back to Project
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

        <div className="space-y-1">
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
          {projectMembers.length === 0 && (
            <p className="text-sm text-text-muted font-medium text-center py-8">
              No project members yet. Add workspace members to this project.
            </p>
          )}
        </div>
      </div>
    );
  }
  
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
  
  if (boardsLoading && boards.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest text-text-muted">
        Loading boards...
      </div>
    );
  }
  
  if (boards.length > 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black uppercase text-text-primary">
            {activeProject.name}
          </h1>
          <button
            onClick={() => setShowTeam(true)}
            className="bg-surface-active hover:bg-surface-hover text-text-primary font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-sm transition-colors"
          >
            Manage Team ({projectMembers.length})
          </button>
        </div>
        <p className="text-sm text-text-muted mb-6">
          Select a board to view:
        </p>
        <div className="space-y-2">
          {boards.map(board => (
            <div key={board.id} className="p-3 bg-surface border border-border rounded-md cursor-pointer hover:bg-surface-hover"
                 onClick={() => navigate(`/workspaces/${activeProject.workspaceId}/projects/${activeProject.id}/boards/${board.id}`)}>
              <span className="font-bold text-text-primary">{board.name}</span>
              {board.description && (
                <p className="mt-1 text-xs text-text-muted">{board.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col p-12">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-surface border border-border flex items-center justify-center rounded-md mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-black uppercase text-text-primary mb-4">
          {activeProject.name}
        </h1>
        
        <p className="text-sm text-text-muted mb-8 max-w-md">
          This project doesn't have any boards yet. Create your first board to start organizing tasks.
        </p>
        
        <div className="space-y-4">
          {userRole !== 'member' && (
            <button
              onClick={() => {
                setIsBoardModalOpen(true);
              }}
              className="bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-sm transition-colors"
            >
              Create First Board
            </button>
          )}

          <button
            onClick={() => setShowTeam(true)}
            className="bg-surface-active hover:bg-surface-hover text-text-primary font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-sm transition-colors"
          >
            Manage Team ({projectMembers.length})
          </button>
          
          <button
            onClick={() => {
              navigate(`/workspaces/${workspaceId}`);
            }}
            className="bg-surface-active hover:bg-surface-hover text-text-primary font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-sm transition-colors"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    </div>
  );
};