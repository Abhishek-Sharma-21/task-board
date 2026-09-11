import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useProjectStore, Project } from '../features/projects/projectStore';
import { useProjectMemberStore } from '../features/projects/projectMemberStore';
import { useAuthStore } from '../features/auth/authStore';
import { Spinner } from '../components/Spinner';

export const WorkspaceSettingsPage: React.FC = () => {
  useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);

  const {
    activeWorkspace,
    members,
    updateWorkspace,
    pruneActivityLogs,
    deleteWorkspace,
    leaveWorkspace,
    inviteMember,
    changeMemberRole,
    removeMember,
    fetchMembers,
  } = useWorkspaceStore();

  const { projects, fetchProjects, createProject, deleteProject } = useProjectStore();
  const {
    members: projectMembers,
    fetchMembers: fetchProjectMembers,
    addMember: addProjectMember,
    removeMember: removeProjectMember,
    setHead: setProjectHead,
  } = useProjectMemberStore();

  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'projects' | 'permissions' | 'danger'>('general');

  // General Settings State
  const [workspaceName, setWorkspaceName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Retention Settings State
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [retentionSuccess, setRetentionSuccess] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneMessage, setPruneMessage] = useState<string | null>(null);

  // Invite Member State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Project Creation Modal State
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Manage Project Head / Members Modal State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addProjMemberId, setAddProjMemberId] = useState('');
  const [isAddingProjMember, setIsAddingProjMember] = useState(false);

  // Danger Actions State
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      setRetentionDays(activeWorkspace.activityRetentionDays ?? 30);
      fetchMembers(activeWorkspace.id);
      fetchProjects(activeWorkspace.id);
    }
  }, [activeWorkspace, fetchMembers, fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectMembers(selectedProject.id);
    }
  }, [selectedProject, fetchProjectMembers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateProjectOpen(false);
        setSelectedProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const userMember = members.find((m) => m.id === user?.id);
  const userRole = userMember ? userMember.role : 'member';
  const isOwner = userRole === 'owner';
  const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !workspaceName.trim() || isSavingName) return;
    setIsSavingName(true);
    setNameSuccess(false);
    try {
      await updateWorkspace(activeWorkspace.id, { name: workspaceName.trim() });
      setNameSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update workspace name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUpdateRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || isSavingRetention) return;
    setIsSavingRetention(true);
    setRetentionSuccess(false);
    try {
      await updateWorkspace(activeWorkspace.id, { activityRetentionDays: retentionDays });
      setRetentionSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update activity retention policy');
    } finally {
      setIsSavingRetention(false);
    }
  };

  const handlePruneActivityLogs = async () => {
    if (!activeWorkspace || isPruning) return;
    if (!window.confirm('Are you sure you want to purge all expired activity logs immediately? This action cannot be undone.')) return;
    setIsPruning(true);
    setPruneMessage(null);
    try {
      const pruned = await pruneActivityLogs(activeWorkspace.id);
      setPruneMessage(`Successfully purged ${pruned} expired activity log(s).`);
    } catch (err: any) {
      alert(err.message || 'Failed to prune activity logs');
    } finally {
      setIsPruning(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail.trim() || isInviting) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await inviteMember(activeWorkspace.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteSuccess(true);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newProjectName.trim() || isCreatingProject) return;
    setIsCreatingProject(true);
    try {
      await createProject(
        activeWorkspace.id,
        newProjectName.trim(),
        newProjectDesc.trim(),
        selectedHeadId || undefined,
        selectedMemberIds
      );
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedHeadId('');
      setSelectedMemberIds([]);
      setIsCreateProjectOpen(false);
      await fetchProjects(activeWorkspace.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleSetProjectHead = async (userId: string) => {
    if (!selectedProject || !window.confirm('Change Project Head? The current head will become a project member.')) return;
    try {
      await setProjectHead(selectedProject.id, userId);
    } catch (err: any) {
      alert(err.message || 'Failed to set Project Head');
    }
  };

  const handleAddProjectMember = async () => {
    if (!selectedProject || !addProjMemberId || isAddingProjMember) return;
    setIsAddingProjMember(true);
    try {
      await addProjectMember(selectedProject.id, addProjMemberId);
      setAddProjMemberId('');
    } catch (err: any) {
      alert(err.message || 'Failed to add project member');
    } finally {
      setIsAddingProjMember(false);
    }
  };

  const handleRemoveProjectMember = async (userId: string) => {
    if (!selectedProject || !window.confirm('Remove member from project?')) return;
    try {
      await removeProjectMember(selectedProject.id, userId);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleDeleteProject = async (projId: string) => {
    if (!window.confirm('Are you sure you want to delete this project and all its boards?')) return;
    try {
      await deleteProject(projId);
      if (selectedProject?.id === projId) setSelectedProject(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspace || isLeaving) return;
    if (!window.confirm(`Are you sure you want to leave ${activeWorkspace.name}?`)) return;
    setIsLeaving(true);
    try {
      await leaveWorkspace(activeWorkspace.id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to leave workspace');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace || isDeleting) return;
    if (!window.confirm(`PERMANENT ACTION: Are you sure you want to delete ${activeWorkspace.name}? All projects, boards, and tasks will be permanently removed.`)) return;
    setIsDeleting(true);
    try {
      await deleteWorkspace(activeWorkspace.id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="py-12 text-center text-xs font-mono text-text-muted">
        No active workspace selected.
      </div>
    );
  }

  if (!isAdminOrOwner) {
    return (
      <div className="border-2 border-border bg-surface p-8 text-center rounded-sm max-w-lg mx-auto my-12">
        <h2 className="text-xl font-black uppercase text-danger tracking-tight">
          403 Unauthorized Access
        </h2>
        <p className="mt-2 text-xs text-text-muted font-mono">
          Workspace Settings are restricted to Workspace Owners and Admins only.
        </p>
      </div>
    );
  }

  const currentHeadMember = projectMembers.find((m) => m.role === 'head');
  const availableWorkspaceUsersForProject = members.filter(
    (wm) => !projectMembers.some((pm) => pm.id === wm.id)
  );

  return (
    <div className="space-y-8 max-w-5xl font-sans">
      {/* Header */}
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
          SETTINGS & CONFIGURATION
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-text-primary">
          {activeWorkspace.name} SETTINGS.
        </h1>
        <p className="text-xs text-text-secondary font-mono mt-1">
          Manage workspace identity, membership, projects, permissions, and security.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border space-x-1 font-mono text-xs font-bold uppercase tracking-wider overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('general')}
          className={`py-2.5 px-4 rounded-t-sm border-t border-l border-r transition-colors shrink-0 ${
            activeTab === 'general'
              ? 'bg-surface border-border text-primary font-black border-b-2 border-b-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`py-2.5 px-4 rounded-t-sm border-t border-l border-r transition-colors shrink-0 ${
            activeTab === 'members'
              ? 'bg-surface border-border text-primary font-black border-b-2 border-b-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`py-2.5 px-4 rounded-t-sm border-t border-l border-r transition-colors shrink-0 ${
            activeTab === 'projects'
              ? 'bg-surface border-border text-primary font-black border-b-2 border-b-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`py-2.5 px-4 rounded-t-sm border-t border-l border-r transition-colors shrink-0 ${
            activeTab === 'permissions'
              ? 'bg-surface border-border text-primary font-black border-b-2 border-b-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Permissions
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`py-2.5 px-4 rounded-t-sm border-t border-l border-r transition-colors shrink-0 ${
            activeTab === 'danger'
              ? 'bg-surface border-border text-danger font-black border-b-2 border-b-danger'
              : 'border-transparent text-text-muted hover:text-danger'
          }`}
        >
          Danger Zone
        </button>
      </div>

      {/* TAB CONTENT: GENERAL */}
      {activeTab === 'general' && (
        <div className="bg-surface border border-border rounded-sm p-6 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-text-primary">General Information</h3>
            <p className="text-xs text-text-muted font-mono mt-0.5">Workspace display name and identifier.</p>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4 max-w-md">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-2">
                Workspace Name *
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={!isAdminOrOwner}
                className="w-full bg-input border border-border rounded-sm py-2 px-3 text-text-primary text-xs font-mono focus:outline-none focus:border-primary disabled:opacity-60"
                required
              />
            </div>

            {isAdminOrOwner && (
              <button
                type="submit"
                disabled={isSavingName || !workspaceName.trim()}
                className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors flex items-center gap-2"
              >
                {isSavingName && <Spinner />}
                {isSavingName ? 'Saving...' : 'Save Workspace Name'}
              </button>
            )}

            {nameSuccess && (
              <p className="text-xs font-mono text-success">Workspace name updated successfully!</p>
            )}
          </form>

          {/* Activity Log Retention Policy */}
          <div className="pt-6 border-t border-border space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase text-text-primary">Activity Log Retention Policy</h3>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                Automatically prune old activity history events older than the specified duration, or purge manually.
              </p>
            </div>

            <form onSubmit={handleUpdateRetention} className="space-y-4 max-w-md">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-2">
                  Retention Duration
                </label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                  disabled={!isAdminOrOwner}
                  className="w-full bg-input border border-border rounded-sm py-2 px-3 text-text-primary text-xs font-mono focus:outline-none focus:border-primary disabled:opacity-60"
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days (Default)</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year (365 Days)</option>
                  <option value={0}>Keep Forever (0 Days)</option>
                </select>
              </div>

              {isAdminOrOwner && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSavingRetention}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors flex items-center gap-2"
                  >
                    {isSavingRetention && <Spinner />}
                    {isSavingRetention ? 'Saving...' : 'Save Retention Policy'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePruneActivityLogs}
                    disabled={isPruning}
                    className="bg-surface border border-border hover:border-danger text-danger font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors flex items-center gap-2"
                  >
                    {isPruning && <Spinner />}
                    {isPruning ? 'Purging...' : 'Purge Expired Logs Now'}
                  </button>
                </div>
              )}

              {retentionSuccess && (
                <p className="text-xs font-mono text-success">Activity retention policy updated successfully!</p>
              )}
              {pruneMessage && (
                <p className="text-xs font-mono text-success">{pruneMessage}</p>
              )}
            </form>
          </div>

          <div className="pt-4 border-t border-border font-mono text-xs space-y-1">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Workspace ID:</span>
            <p className="text-text-secondary select-all">{activeWorkspace.id}</p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-surface border border-border rounded-sm p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-black uppercase text-text-primary">Workspace Members</h3>
              <p className="text-xs text-text-muted font-mono mt-0.5">View and manage users who have access to this workspace.</p>
            </div>
          </div>

          {/* Invite Form */}
          {isAdminOrOwner && (
            <form onSubmit={handleInviteMember} className="border border-border bg-surface-hover p-4 rounded-sm space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-primary font-bold block">
                Add Workspace Member
              </span>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="User email address..."
                  className="flex-1 bg-input border border-border rounded-sm py-2 px-3 text-text-primary placeholder-text-faint text-xs font-mono focus:outline-none focus:border-primary"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="bg-input border border-border rounded-sm py-2 px-3 text-text-primary text-xs font-mono focus:outline-none focus:border-primary"
                >
                  <option value="member">MEMBER</option>
                  <option value="admin">ADMIN</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isInviting && <Spinner />}
                  {isInviting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
              {inviteError && <p className="text-xs font-mono text-danger">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs font-mono text-success">User added to workspace successfully!</p>}
            </form>
          )}

          {/* Members Table */}
          <div className="border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs min-w-[500px]">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-[9px] uppercase tracking-widest text-text-muted">
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Role</th>
                  {isAdminOrOwner && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => {
                  const isMe = m.id === user?.id;
                  let canRemove = false;
                  let canChangeRole = false;

                  if (!isMe && m.role !== 'owner') {
                    if (isOwner) {
                      canRemove = true;
                      canChangeRole = true;
                    } else if (isAdminOrOwner && m.role === 'member') {
                      canRemove = true;
                    }
                  }

                  return (
                    <tr key={m.id} className="hover:bg-surface-hover/50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-text-primary block">{m.name} {isMe && '(You)'}</span>
                        <span className="text-text-muted text-[10px]">{m.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        {canChangeRole ? (
                          <select
                            value={m.role}
                            onChange={(e) => changeMemberRole(activeWorkspace.id, m.id, e.target.value as 'admin' | 'member')}
                            className="bg-input border border-border text-[10px] font-mono py-1 px-2 rounded-sm text-text-primary"
                          >
                            <option value="member">MEMBER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${
                            m.role === 'owner' ? 'bg-primary-light text-primary' : m.role === 'admin' ? 'bg-surface-active text-text-primary' : 'bg-surface text-text-muted'
                          }`}>
                            {m.role}
                          </span>
                        )}
                      </td>
                      {isAdminOrOwner && (
                        <td className="py-3 px-4 text-right">
                          {canRemove && (
                            <button
                              onClick={() => removeMember(activeWorkspace.id, m.id)}
                              className="text-text-muted hover:text-danger text-[10px] uppercase font-mono tracking-wider transition-colors"
                            >
                              [REMOVE]
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="bg-surface border border-border rounded-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black uppercase text-text-primary">Workspace Projects</h3>
              <p className="text-xs text-text-muted font-mono mt-0.5">Projects and Project Head assignments for this workspace.</p>
            </div>

            {isAdminOrOwner && (
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                className="bg-primary hover:bg-primary-hover text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors"
              >
                + New Project
              </button>
            )}
          </div>

          {/* Projects Table */}
          <div className="border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs min-w-[500px]">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-[9px] uppercase tracking-widest text-text-muted">
                  <th className="py-2.5 px-4">Project Name</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-surface-hover/50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-text-primary block">{proj.name}</span>
                      {proj.description && <span className="text-text-muted text-[10px]">{proj.description}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] uppercase font-bold text-text-secondary bg-surface-active px-2 py-0.5 rounded-sm">
                        {proj.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-3">
                      <button
                        onClick={() => setSelectedProject(proj)}
                        className="text-primary hover:text-primary-hover text-[10px] uppercase font-mono font-bold tracking-wider"
                      >
                        [MANAGE TEAM]
                      </button>
                      {isAdminOrOwner && (
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="text-text-muted hover:text-danger text-[10px] uppercase font-mono tracking-wider"
                        >
                          [DELETE]
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-text-muted italic">
                      No projects found in this workspace.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CREATE PROJECT MODAL */}
          {isCreateProjectOpen && (
            <div 
              onClick={() => setIsCreateProjectOpen(false)}
              className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-surface-elevated border border-border p-6 rounded-sm w-full max-w-lg space-y-6"
              >
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
                    PROJECT SETUP
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
                    CREATE NEW PROJECT.
                  </h3>
                </div>

                <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full bg-input border border-border rounded-sm py-2 px-3 text-text-primary text-xs font-mono focus:outline-none focus:border-primary"
                      placeholder="e.g. Mobile App Redesign"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-1">
                      Description
                    </label>
                    <textarea
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      className="w-full bg-input border border-border rounded-sm py-2 px-3 text-text-primary text-xs font-mono focus:outline-none focus:border-primary h-20 resize-none"
                      placeholder="Brief project goals..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-1">
                      Project Head (Workspace Member)
                    </label>
                    <select
                      value={selectedHeadId}
                      onChange={(e) => setSelectedHeadId(e.target.value)}
                      className="w-full bg-input border border-border rounded-sm py-2 px-3 text-text-primary text-xs font-mono focus:outline-none focus:border-primary"
                    >
                      <option value="">SELECT PROJECT HEAD...</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name.toUpperCase()} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-1">
                      Initial Team Members
                    </label>
                    <div className="border border-border bg-input p-3 rounded-sm max-h-32 overflow-y-auto space-y-2 font-mono text-xs">
                      {members.map((m) => {
                        const isChecked = selectedMemberIds.includes(m.id);
                        return (
                          <label key={m.id} className="flex items-center space-x-2 cursor-pointer text-text-secondary hover:text-text-primary">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMemberIds([...selectedMemberIds, m.id]);
                                } else {
                                  setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                                }
                              }}
                              className="rounded-sm border-border bg-surface text-primary"
                            />
                            <span>{m.name} ({m.email})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateProjectOpen(false)}
                      className="flex-1 py-2 px-4 border border-border text-xs font-mono font-bold uppercase tracking-wider rounded-sm text-text-muted hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingProject || !newProjectName.trim()}
                      className="flex-1 py-2 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-xs font-mono font-bold uppercase tracking-wider rounded-sm text-white flex items-center justify-center gap-2"
                    >
                      {isCreatingProject && <Spinner />}
                      {isCreatingProject ? 'Creating...' : 'Create Project'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MANAGE PROJECT TEAM DRAWER/MODAL */}
          {selectedProject && (
            <div 
              onClick={() => setSelectedProject(null)}
              className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-surface-elevated border border-border p-6 rounded-sm w-full max-w-2xl space-y-6 max-h-[85vh] overflow-y-auto font-sans"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
                      MANAGE PROJECT TEAM
                    </span>
                    <h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
                      {selectedProject.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-text-muted hover:text-text-primary font-mono text-xs"
                  >
                    [CLOSE]
                  </button>
                </div>

                {/* Current Project Head info */}
                <div className="bg-surface-hover border border-border p-4 rounded-sm space-y-2 font-mono text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted block font-bold">
                    Current Project Head
                  </span>
                  {currentHeadMember ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-text-primary">{currentHeadMember.name}</span>
                        <span className="text-text-muted text-[10px] ml-2">({currentHeadMember.email})</span>
                      </div>
                      <span className="text-[9px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-sm uppercase">
                        HEAD
                      </span>
                    </div>
                  ) : (
                    <p className="text-text-faint italic">No Project Head assigned</p>
                  )}
                </div>

                {/* Add Member from Workspace Dropdown */}
                {isAdminOrOwner && (
                  <div className="border border-border p-4 rounded-sm bg-surface space-y-3 font-mono text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold block">
                      Add Project Member (from Workspace)
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={addProjMemberId}
                        onChange={(e) => setAddProjMemberId(e.target.value)}
                        className="flex-1 bg-input border border-border rounded-sm py-2 px-3 text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="">SELECT WORKSPACE MEMBER...</option>
                        {availableWorkspaceUsersForProject.map((wm) => (
                          <option key={wm.id} value={wm.id}>
                            {wm.name.toUpperCase()} ({wm.email})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddProjectMember}
                        disabled={!addProjMemberId || isAddingProjMember}
                        className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase px-4 py-2 rounded-sm shrink-0"
                      >
                        {isAddingProjMember ? 'ADDING...' : 'ADD MEMBER'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Project Members List */}
                <div className="space-y-2 font-mono text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted block font-bold">
                    Project Members ({projectMembers.length})
                  </span>
                  <div className="border border-border rounded-sm divide-y divide-border">
                    {projectMembers.map((pm) => (
                      <div key={pm.id} className="p-3 flex items-center justify-between hover:bg-surface-hover/50">
                        <div>
                          <span className="font-bold text-text-primary">{pm.name}</span>
                          <span className="text-text-muted text-[10px] ml-2">{pm.email}</span>
                          {pm.role === 'head' && (
                            <span className="ml-2 text-[9px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-sm uppercase">
                              HEAD
                            </span>
                          )}
                        </div>

                        {isAdminOrOwner && (
                          <div className="flex space-x-3">
                            {pm.role !== 'head' && (
                              <button
                                onClick={() => handleSetProjectHead(pm.id)}
                                className="text-text-muted hover:text-primary text-[10px] uppercase font-bold"
                              >
                                [SET HEAD]
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveProjectMember(pm.id)}
                              className="text-text-muted hover:text-danger text-[10px] uppercase font-bold"
                            >
                              [REMOVE]
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {projectMembers.length === 0 && (
                      <div className="p-6 text-center text-text-muted italic">
                        No members explicitly assigned to this project yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PERMISSIONS */}
      {activeTab === 'permissions' && (
        <div className="bg-surface border border-border rounded-sm p-6 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-text-primary">Workspace & Project Permission Model</h3>
            <p className="text-xs text-text-muted font-mono mt-0.5">Understanding access boundaries across roles.</p>
          </div>

          <div className="border border-border rounded-sm overflow-x-auto font-mono text-xs">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-[9px] uppercase tracking-widest text-text-muted">
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Workspace Scope</th>
                  <th className="py-2.5 px-4">Project Access</th>
                  <th className="py-2.5 px-4">Management Capabilities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-3 px-4 font-bold text-primary">OWNER</td>
                  <td className="py-3 px-4 text-text-secondary">Full Workspace Control</td>
                  <td className="py-3 px-4 text-text-secondary">All Workspace Projects</td>
                  <td className="py-3 px-4 text-text-muted">Workspace Settings, Delete Workspace, Manage Roles & Members, Create/Delete Projects, Change Project Heads</td>
                </tr>
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-3 px-4 font-bold text-text-primary">ADMIN</td>
                  <td className="py-3 px-4 text-text-secondary">Workspace Administration</td>
                  <td className="py-3 px-4 text-text-secondary">All Workspace Projects</td>
                  <td className="py-3 px-4 text-text-muted">Invite/Remove Members, Create/Manage Projects, Assign Project Heads & Team Members</td>
                </tr>
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-3 px-4 font-bold text-text-primary">PROJECT HEAD</td>
                  <td className="py-3 px-4 text-text-secondary">Project-Specific Lead</td>
                  <td className="py-3 px-4 text-text-secondary">Assigned Project Only</td>
                  <td className="py-3 px-4 text-text-muted">Manage Project Boards, Columns, Tasks, and Add/Remove Project Members</td>
                </tr>
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-3 px-4 font-bold text-text-muted">MEMBER</td>
                  <td className="py-3 px-4 text-text-secondary">Standard Workspace Access</td>
                  <td className="py-3 px-4 text-text-secondary">Assigned Projects Only</td>
                  <td className="py-3 px-4 text-text-muted">View/Edit Tasks, Comments, and Move Tasks in assigned Project Boards</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DANGER ZONE */}
      {activeTab === 'danger' && (
        <div className="bg-surface border border-danger/30 rounded-sm p-6 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-danger">Danger Zone</h3>
            <p className="text-xs text-text-muted font-mono mt-0.5">Destructive actions for workspace membership and ownership.</p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Leave Workspace */}
            <div className="border border-border p-4 rounded-sm flex items-center justify-between bg-surface-hover">
              <div>
                <span className="font-bold text-xs uppercase font-mono text-text-primary block">Leave Workspace</span>
                <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                  Remove your membership from this workspace. You will lose access to all its projects and boards.
                </span>
              </div>
              <button
                onClick={handleLeaveWorkspace}
                disabled={isLeaving}
                className="bg-surface border border-border hover:border-danger text-danger font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors shrink-0 flex items-center gap-2"
              >
                {isLeaving && <Spinner />}
                {isLeaving ? 'Leaving...' : 'Leave Workspace'}
              </button>
            </div>

            {/* Delete Workspace */}
            {isOwner && (
              <div className="border border-danger/40 p-4 rounded-sm flex items-center justify-between bg-danger-light/10">
                <div>
                  <span className="font-bold text-xs uppercase font-mono text-danger block">Delete Workspace</span>
                  <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                    Permanently delete this workspace and all associated projects, boards, columns, and tasks. Cannot be undone.
                  </span>
                </div>
                <button
                  onClick={handleDeleteWorkspace}
                  disabled={isDeleting}
                  className="bg-danger hover:bg-danger/80 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors shrink-0 flex items-center gap-2"
                >
                  {isDeleting && <Spinner />}
                  {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
