import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useProjectStore } from '../features/projects/projectStore';
import { useBoardStore } from '../features/boards/boardStore';
import { useNotificationStore } from '../features/notifications/notificationStore';
import { useThemeStore } from '../stores/themeStore';
import { connectSocket, disconnectSocket } from '../sockets/socket';
import { Spinner } from '../components/Spinner';
import { OfflineSyncBanner } from '../components/common/OfflineSyncBanner';
import { ToastContainer } from '../components/common/ToastContainer';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { Home, LayoutGrid, Calendar, Bell, Settings, ChevronDown, ChevronRight, Sun, Moon, Folder, LogOut, Users, Activity, Menu } from 'lucide-react';
import { WorkspaceMembersModal } from '../components/WorkspaceMembersModal';

export const AppLayout: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId, projectId, boardId } = useParams<{ workspaceId: string; projectId: string; boardId: string }>();

  // Modals & Navigation state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const [workspaceNameInput, setWorkspaceNameInput] = useState('');
  const [projectNameInput, setProjectNameInput] = useState('');
  const [boardNameInput, setBoardNameInput] = useState('');
  const [boardDescInput, setBoardDescInput] = useState('');

  // Team Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Loading states for async buttons
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notifications Store
  const {
    notifications,
    isLoading: isNotifLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  // Workspaces Store
  const {
    workspaces,
    activeWorkspace,
    members,
    fetchWorkspaces,
    selectWorkspace,
    createWorkspace,
    inviteMember,
    changeMemberRole,
    removeMember,
  } = useWorkspaceStore();

  // Projects Store
  const {
    projects,
    activeProject,
    fetchProjects,
    selectProject,
    createProject,
  } = useProjectStore();

  // Boards Store
  const {
    boards,
    activeBoard,
    fetchBoards,
    selectBoard,
    createBoard,
  } = useBoardStore();

  useEffect(() => {
    fetchWorkspaces(workspaceId);
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (user) {
      const socket = connectSocket();
      fetchNotifications();
      const handleNewNotification = (newNotif: any) => {
        useNotificationStore.setState((state) => ({
          notifications: [newNotif, ...state.notifications.filter((n) => n.id !== newNotif.id)],
        }));
      };
      socket?.on?.('notification:new', handleNewNotification);
      return () => {
        socket?.off?.('notification:new', handleNewNotification);
      };
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchProjects(activeWorkspace.id);
    }
  }, [activeWorkspace, fetchProjects]);

  useEffect(() => {
    if (activeProject) {
      fetchBoards(activeProject.id);
    }
  }, [activeProject, fetchBoards]);

  // Sync route params with store state on direct load
  useEffect(() => {
    if (workspaceId && workspaceId !== 'undefined' && workspaces.length > 0 && activeWorkspace?.id !== workspaceId) {
      const matched = workspaces.find((w) => w.id === workspaceId);
      if (matched) {
        selectWorkspace(workspaceId);
      }
    }
  }, [workspaceId, workspaces, activeWorkspace, selectWorkspace]);

  useEffect(() => {
    if (projectId && projects.length > 0 && activeProject?.id !== projectId) {
      selectProject(projectId);
    }
  }, [projectId, projects, activeProject, selectProject]);

  useEffect(() => {
    if (boardId && boards.length > 0 && activeBoard?.id !== boardId) {
      selectBoard(boardId);
    }
  }, [boardId, boards, activeBoard, selectBoard]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Close modals on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileSidebarOpen(false);
        setIsWorkspaceModalOpen(false);
        setIsProjectModalOpen(false);
        setIsBoardModalOpen(false);
        setIsTeamModalOpen(false);
        setIsNotificationOpen(false);
        setIsMembersModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);



  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      disconnectSocket();
      await logout();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const submitCreateWorkspace = async () => {
    if (!workspaceNameInput?.trim() || isCreatingWorkspace) return;
    setIsCreatingWorkspace(true);
    try {
      const ws = await createWorkspace(workspaceNameInput.trim());
      setWorkspaceNameInput('');
      setIsWorkspaceModalOpen(false);
      navigate(`/workspaces/${ws.id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const [projectHeadInput, setProjectHeadInput] = useState('');

  const submitCreateProject = async () => {
    if (!activeWorkspace || !projectNameInput?.trim() || isCreatingProject) return;
    setIsCreatingProject(true);
    try {
      const proj = await createProject(
        activeWorkspace.id,
        projectNameInput.trim(),
        '',
        projectHeadInput || undefined
      );
      setProjectNameInput('');
      setProjectHeadInput('');
      setIsProjectModalOpen(false);
      navigate(`/workspaces/${activeWorkspace.id}/projects/${proj.id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const submitCreateBoard = async () => {
    if (!activeWorkspace || !activeProject || !boardNameInput?.trim() || isCreatingBoard) return;
    setIsCreatingBoard(true);
    try {
      const brd = await createBoard(activeProject.id, boardNameInput.trim(), boardDescInput.trim());
      setBoardNameInput('');
      setBoardDescInput('');
      setIsBoardModalOpen(false);
      navigate(`/workspaces/${activeWorkspace.id}/projects/${activeProject.id}/boards/${brd.id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreatingBoard(false);
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

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!activeWorkspace) return;
    try {
      await changeMemberRole(activeWorkspace.id, userId, role);
    } catch (err: any) {
      alert(err.message || 'Failed to change role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeWorkspace || removingMemberId) return;
    if (!window.confirm('Are you sure you want to remove this member from the workspace?')) return;
    setRemovingMemberId(userId);
    try {
      await removeMember(activeWorkspace.id, userId);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Find user member role
  const userMember = members.find((m) => m.id === user?.id);
  const userRole = userMember ? userMember.role : 'member';

  const unreadCount = notifications.filter((n) => !n.read).length;
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen flex bg-page text-text-primary font-sans relative overflow-x-hidden">
      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-overlay backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col justify-between p-6 overflow-y-auto transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-2" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="w-6 h-6 bg-primary flex items-center justify-center rounded-sm font-bold text-sm text-white">
              T
            </div>
            <span className="text-sm font-black tracking-widest text-text-primary uppercase">
              Task Board
            </span>
          </div>

          {/* Workspace Switcher */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted">
                WORKSPACE
              </span>
                <button
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="text-[10px] font-mono text-primary hover:text-primary-hover font-bold btn-press"
                  aria-label="New Workspace"
                >
                + NEW
              </button>
            </div>
            {workspaces.length > 0 ? (
              <select
                value={activeWorkspace?.id || ''}
                onChange={(e) => {
                  selectWorkspace(e.target.value);
                  navigate(`/workspaces/${e.target.value}`);
                }}
                className="bg-input border border-border text-sm font-bold text-text-secondary py-2 px-3 rounded-sm w-full focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-text-faint italic">No workspaces found</div>
            )}
          </div>

          {/* Projects Switcher */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted">
                PROJECTS
              </span>
              {userRole !== 'member' && (
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="text-[10px] font-mono text-primary hover:text-primary-hover font-bold btn-press"
                  disabled={!activeWorkspace}
                  aria-label="New Project"
                >
                  + NEW
                </button>
              )}
            </div>
            {projects.length > 0 ? (
              <div className="space-y-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      selectProject(p.id);
                      navigate(`/workspaces/${activeWorkspace?.id}/projects/${p.id}`);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors border ${
                      activeProject?.id === p.id
                        ? 'bg-surface-active border-border text-text-primary'
                        : 'border-transparent text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-faint italic">No projects found</div>
            )}
          </div>

          {/* Boards List */}
          {activeProject && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted">
                  BOARDS
                </span>
                {userRole !== 'member' && (
                  <button
                    onClick={() => setIsBoardModalOpen(true)}
                  className="text-[10px] font-mono text-primary hover:text-primary-hover font-bold btn-press"
                  aria-label="New Board"
                  >
                    + NEW
                  </button>
                )}
              </div>
              {boards.length > 0 ? (
                <div className="space-y-1">
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => navigate(`/workspaces/${activeWorkspace?.id}/projects/${activeProject.id}/boards/${b.id}`)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors border ${
                        activeBoard?.id === b.id
                          ? 'bg-surface-active border-border text-text-primary'
                          : 'border-transparent text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-text-faint italic">No boards found</div>
              )}
            </div>
          )}

          {/* Primary Navigation */}
          <nav className="space-y-1 pt-4 border-t border-border-subtle">
            <button
              onClick={() => navigate('/')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm text-xs font-bold transition-colors border-l-2 ${
                location.pathname === '/' 
                  ? 'bg-surface-active border-l-primary text-text-primary' 
                  : 'border-l-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Home</span>
            </button>
            <button
              onClick={() => navigate('/my-work')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm text-xs font-bold transition-colors border-l-2 ${
                location.pathname === '/my-work' 
                  ? 'bg-surface-active border-l-primary text-text-primary' 
                  : 'border-l-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>My Work</span>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm text-xs font-bold transition-colors border-l-2 ${
                location.pathname === '/calendar' 
                  ? 'bg-surface-active border-l-primary text-text-primary' 
                  : 'border-l-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm text-xs font-bold transition-colors border-l-2 ${
                isNotificationOpen 
                  ? 'bg-surface-active border-l-primary text-text-primary' 
                  : 'border-l-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-auto text-[9px] font-mono bg-primary text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          </nav>

          {/* Settings & Admin - Collapsible */}
          <div className="pt-4 border-t border-border-subtle">
            <button
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-text-muted hover:text-text-secondary transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-4 h-4" />
                <span>Settings & Admin</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSettingsExpanded ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isSettingsExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-1 mt-1">
                <button
                  onClick={() => {
                    const wsId = activeWorkspace?.id || workspaces[0]?.id;
                    if (wsId) navigate(`/workspaces/${wsId}/settings`);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-1.5 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-sm transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span>Workspace Settings</span>
                </button>
                <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="w-full flex items-center space-x-3 px-3 py-1.5 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-sm transition-colors"
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Team Settings</span>
                </button>
                <button
                  onClick={() => {
                    const wsId = activeWorkspace?.id || workspaces[0]?.id;
                    if (wsId) navigate(`/workspaces/${wsId}/activity`);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-1.5 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-sm transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>Activity History</span>
                </button>
                <button
                  onClick={() => navigate('/workflow')}
                  className="w-full flex items-center space-x-3 px-3 py-1.5 text-[11px] font-bold text-primary/60 hover:text-primary rounded-sm transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span>How it works</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="space-y-3 pt-6 border-t border-border mt-8">
          <div className="text-[10px] font-mono text-text-faint flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            <span className="capitalize truncate">{activeWorkspace?.name || 'Workspace'}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 text-[11px] font-mono text-text-muted hover:text-primary transition-colors w-full text-left btn-press"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center space-x-2 text-[11px] font-mono text-text-muted hover:text-primary transition-colors w-full text-left btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? <Spinner /> : <LogOut className="w-3.5 h-3.5" />}
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Body Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-header backdrop-blur-sm shadow-theme-header border-b border-border flex items-center justify-between px-4 sm:px-6 md:px-8 gap-3 sticky top-0 z-30">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-1.5 text-text-muted hover:text-text-primary border border-border rounded-sm md:hidden shrink-0 btn-press"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="truncate">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-widest text-text-faint block leading-tight">
                PROJECT / PRODUCT
              </span>
              <span className="text-xs sm:text-sm font-black tracking-tight text-text-primary truncate block">
                {activeProject?.name || 'Select Project'}
              </span>
            </div>
          </div>

          {/* Header Actions Panel */}
          {user && (
            <div className="flex items-center space-x-3 sm:space-x-6 shrink-0">
              {/* Members Button */}
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors p-1 btn-press"
                title="Workspace Members"
              >
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-mono font-bold hidden sm:inline">{members.length}</span>
              </button>

              {/* Notification Bell Icon */}
              <NotificationDropdown
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                onToggle={() => setIsNotificationOpen(!isNotificationOpen)}
                notifications={notifications}
                unreadCount={unreadCount}
                isLoading={isNotifLoading}
                onMarkAllAsRead={() => markAllAsRead()}
                onMarkAsRead={(id) => markAsRead(id)}
              />

              {/* User Profile Badge & Settings */}
              <div
                onClick={() => navigate(`/workspaces/${activeWorkspace?.id || workspaces[0]?.id || ''}/settings`)}
                className="flex items-center space-x-2 sm:space-x-3 bg-surface-hover border border-border py-1.5 px-2.5 rounded-sm shrink-0 cursor-pointer hover:border-primary hover:bg-surface-active transition-colors btn-press"
                title="Open Settings & Profile"
              >
                <div className="w-6 h-6 bg-primary flex items-center justify-center rounded-sm font-bold text-[10px] text-white font-mono shrink-0">
                  {getInitials(user.name)}
                </div>
                <span className="text-[11px] font-bold text-text-secondary hidden sm:inline truncate max-w-[100px] md:max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[9px] font-mono border border-border text-text-muted px-1 py-0.5 rounded-sm uppercase shrink-0">
                  {userRole}
                </span>
                <span className="text-[9px] font-mono border border-border text-text-muted px-1 py-0.5 rounded-sm uppercase shrink-0 flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-12">
          <OfflineSyncBanner />
          <Outlet context={{ setIsBoardModalOpen }} />
        </main>
        <ToastContainer />
      </div>

      {/* Workspace Custom Modal */}
      {isWorkspaceModalOpen && (
        <div 
          onClick={() => setIsWorkspaceModalOpen(false)}
          className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-elevated border border-border p-6 rounded-sm w-full max-w-sm space-y-6"
          >
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
                CREATE NEW
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
                NEW WORKSPACE.
              </h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitCreateWorkspace(); }} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-2">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={workspaceNameInput}
                  onChange={(e) => setWorkspaceNameInput(e.target.value)}
                  className="block w-full bg-input border border-border rounded-sm py-2.5 px-3 text-text-primary placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  placeholder="e.g. Acme Corp"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  disabled={isCreatingWorkspace}
                  className="flex-1 py-2 px-4 border border-border text-xs font-bold uppercase tracking-wider rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWorkspace || !workspaceNameInput.trim()}
                  className="flex-1 py-2 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-xs font-bold uppercase tracking-wider rounded-sm text-white transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingWorkspace && <Spinner />}
                  {isCreatingWorkspace ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Custom Modal */}
      {isProjectModalOpen && (
        <div 
          onClick={() => setIsProjectModalOpen(false)}
          className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-elevated border border-border p-6 rounded-sm w-full max-w-sm space-y-6"
          >
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
                CREATE NEW
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
                NEW PROJECT.
              </h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitCreateProject(); }} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  className="block w-full bg-input border border-border rounded-sm py-2.5 px-3 text-text-primary placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  placeholder="e.g. Website Launch"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  disabled={isCreatingProject}
                  className="flex-1 py-2 px-4 border border-border text-xs font-bold uppercase tracking-wider rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject || !projectNameInput.trim()}
                  className="flex-1 py-2 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-xs font-bold uppercase tracking-wider rounded-sm text-white transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingProject && <Spinner />}
                  {isCreatingProject ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Board Custom Modal */}
      {isBoardModalOpen && (
        <div 
          onClick={() => setIsBoardModalOpen(false)}
          className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-elevated border border-border p-6 rounded-sm w-full max-w-sm space-y-6"
          >
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
                CREATE NEW
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
                NEW BOARD.
              </h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitCreateBoard(); }} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-2">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={boardNameInput}
                  onChange={(e) => setBoardNameInput(e.target.value)}
                  className="block w-full bg-input border border-border rounded-sm py-2.5 px-3 text-text-primary placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm mb-4"
                  placeholder="e.g. Sprint 05"
                  autoFocus
                />

                <label className="block text-[10px] uppercase font-mono tracking-wider text-text-muted mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={boardDescInput}
                  onChange={(e) => setBoardDescInput(e.target.value)}
                  className="block w-full bg-input border border-border rounded-sm py-2.5 px-3 text-text-primary placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  placeholder="Board description..."
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBoardModalOpen(false)}
                  disabled={isCreatingBoard}
                  className="flex-1 py-2 px-4 border border-border text-xs font-bold uppercase tracking-wider rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBoard || !boardNameInput.trim()}
                  className="flex-1 py-2 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-xs font-bold uppercase tracking-wider rounded-sm text-white transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingBoard && <Spinner />}
                  {isCreatingBoard ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Settings Custom Modal */}
      {isTeamModalOpen && (
        <div 
          onClick={() => setIsTeamModalOpen(false)}
          className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-elevated border border-border p-6 rounded-sm w-full max-w-2xl space-y-6 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
                  MANAGE TEAM
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
                  WORKSPACE MEMBERS.
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsTeamModalOpen(false);
                  setInviteEmail('');
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                className="text-text-muted hover:text-text-primary font-mono text-sm"
              >
                [CLOSE]
              </button>
            </div>

            {/* Invite Form (only for Owner and Admin) */}
            {(userRole === 'owner' || userRole === 'admin') && (
              <form onSubmit={handleInviteMember} className="border border-border bg-surface-hover p-4 rounded-sm space-y-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-primary font-bold block">
                  Add Workspace Member
                </span>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter user email..."
                    className="flex-1 bg-input border border-border-input rounded-sm py-2 px-3 text-text-primary placeholder-text-faint focus:outline-none focus:border-primary text-xs font-mono"
                    required
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                    className="bg-input border border-border-input rounded-sm py-2 px-3 text-text-primary focus:outline-none focus:border-primary text-xs font-mono"
                  >
                    <option value="member">MEMBER</option>
                    <option value="admin">ADMIN</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors shrink-0 flex items-center gap-2"
                  >
                    {isInviting && <Spinner />}
                    {isInviting ? 'Adding...' : 'Add Member'}
                  </button>
                </div>

                {inviteError && (
                  <p className="text-xs text-danger font-mono mt-2">{inviteError}</p>
                )}
                {inviteSuccess && (
                  <p className="text-xs text-success font-mono mt-2">Member successfully added to workspace!</p>
                )}
              </form>
            )}

            {/* Members List */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted block">
                Members List ({members.length})
              </span>
              <div className="border border-border rounded-sm overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[500px]">
                  <thead>
                    <tr className="bg-surface-hover border-b border-border text-text-muted uppercase tracking-widest text-[9px]">
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Role</th>
                      {(userRole === 'owner' || userRole === 'admin') && (
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const isMe = m.id === user?.id;
                      let canRemove = false;
                      if (!isMe && m.role !== 'owner') {
                        if (userRole === 'owner') {
                          canRemove = true;
                        } else if (userRole === 'admin' && m.role === 'member') {
                          canRemove = true;
                        }
                      }

                      return (
                        <tr key={m.id} className="border-b border-border-subtle hover:bg-surface-hover">
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-[10px] text-text-secondary">
                                {getInitials(m.name)}
                              </div>
                              <div>
                                <span className="text-text-primary font-bold block font-sans">
                                  {m.name} {isMe && <span className="text-[9px] text-primary font-mono font-normal">(YOU)</span>}
                                </span>
                                <span className="text-text-muted text-[10px] block">{m.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {userRole === 'owner' && m.role !== 'owner' && !isMe ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.id, e.target.value as 'admin' | 'member')}
                                className="bg-input border border-border-input rounded-sm py-1 px-2 text-text-primary focus:outline-none focus:border-primary text-[10px]"
                              >
                                <option value="member">MEMBER</option>
                                <option value="admin">ADMIN</option>
                              </select>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${
                                m.role === 'owner'
                                  ? 'border-badge-owner-border bg-badge-owner-bg text-badge-owner-text'
                                  : m.role === 'admin'
                                  ? 'border-badge-admin-border bg-badge-admin-bg text-badge-admin-text'
                                  : 'border-transparent text-text-muted'
                              }`}>
                                {m.role}
                              </span>
                            )}
                          </td>

                          {(userRole === 'owner' || userRole === 'admin') && (
                            <td className="py-3 px-3 text-right">
                              {canRemove ? (
                                <button
                                  onClick={() => handleRemoveMember(m.id)}
                                  disabled={removingMemberId === m.id}
                                  className="text-danger hover:text-danger-hover font-bold hover:underline transition-colors uppercase tracking-wider text-[10px] flex items-center gap-1 disabled:opacity-50"
                                >
                                  {removingMemberId === m.id && <Spinner className="text-danger" />}
                                  {removingMemberId === m.id ? 'Removing...' : 'Remove'}
                                </button>
                              ) : (
                                <span className="text-text-faint italic text-[10px]">--</span>
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
          </div>
        </div>
      )}
      {/* Workspace Members Modal */}
      <WorkspaceMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
      />
    </div>
  );
};