import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useWorkspaceStore } from '../src/features/workspaces/workspaceStore';
import { useProjectStore } from '../src/features/projects/projectStore';
import { useAuthStore } from '../src/features/auth/authStore';
import { useNotificationStore } from '../src/features/notifications/notificationStore';
import { useActivityStore } from '../src/features/activities/activityStore';
import { AppLayout } from '../src/layouts/AppLayout';
import { ActivityPage } from '../src/pages/ActivityPage';
import { api } from '../src/api/client';

// Mock the api client
vi.mock('../src/api/client', () => {
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Workspace & Project Frontend Stores and Layout UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup initial auth state
    useAuthStore.setState({
      user: { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@forgeboard.com' },
      accessToken: 'token-123',
      isInitialized: true,
    });

    useNotificationStore.setState({
      notifications: [],
      isLoading: false,
      error: null,
    });

    useActivityStore.setState({
      activities: [],
      isLoading: false,
      error: null,
    });

    // Reset stores
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspace: null,
      members: [],
      isLoading: false,
      error: null,
    });

    useProjectStore.setState({
      projects: [],
      activeProject: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('Fetches and switch workspaces and projects correctly in Zustand stores', async () => {
    const mockWorkspaces = [
      { id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' },
      { id: 'ws-2', name: 'Forge Labs', ownerId: 'user-123' },
    ];
    const mockProjects = [
      { id: 'p-1', name: 'Launch Control', workspaceId: 'ws-1' },
      { id: 'p-2', name: 'Website Redesign', workspaceId: 'ws-1' },
    ];
    const mockMembers = [
      { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@forgeboard.com', role: 'owner' },
    ];

    // Mock API resolutions
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/workspaces') {
        return Promise.resolve({ data: { success: true, data: mockWorkspaces } });
      }
      if (url === '/workspaces/ws-1/projects') {
        return Promise.resolve({ data: { success: true, data: mockProjects } });
      }
      if (url === '/workspaces/ws-1/members') {
        return Promise.resolve({ data: { success: true, data: mockMembers } });
      }
      return Promise.reject(new Error('Not found'));
    });

    // 1. Fetch workspaces
    await useWorkspaceStore.getState().fetchWorkspaces();
    expect(useWorkspaceStore.getState().workspaces.length).toBe(2);
    expect(useWorkspaceStore.getState().activeWorkspace?.name).toBe('Northstar Studio');

    // 2. Fetch projects
    await useProjectStore.getState().fetchProjects('ws-1');
    expect(useProjectStore.getState().projects.length).toBe(2);
    expect(useProjectStore.getState().activeProject?.name).toBe('Launch Control');

    // 3. Switch active workspace
    await useWorkspaceStore.getState().selectWorkspace('ws-2');
    expect(useWorkspaceStore.getState().activeWorkspace?.name).toBe('Forge Labs');
  });

  it('Renders AppLayout with active workspace, projects list, and user details', async () => {
    const mockWorkspaces = [
      { id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' },
    ];
    const mockProjects = [
      { id: 'p-1', name: 'Launch Control', workspaceId: 'ws-1' },
    ];
    const mockMembers = [
      { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@forgeboard.com', role: 'owner' },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/workspaces') {
        return Promise.resolve({ data: { success: true, data: mockWorkspaces } });
      }
      if (url === '/workspaces/ws-1/projects') {
        return Promise.resolve({ data: { success: true, data: mockProjects } });
      }
      if (url === '/workspaces/ws-1/members') {
        return Promise.resolve({ data: { success: true, data: mockMembers } });
      }
      return Promise.reject(new Error('Not found'));
    });

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    // Verify workspace name exists
    await waitFor(() => {
      expect(screen.getAllByText('Northstar Studio')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Launch Control')[0]).toBeInTheDocument();
      expect(screen.getByText('Abhishek Sharma')).toBeInTheDocument();
      expect(screen.getByText('owner')).toBeInTheDocument();
    });
  });

  it('Opens Team Settings modal and handles invitations, role changes, and member removals for owners', async () => {
    const mockMembers = [
      { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@forgeboard.com', role: 'owner' },
      { id: 'user-456', name: 'Sarah Connor', email: 'sarah@forgeboard.com', role: 'member' },
    ];

    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' }],
      activeWorkspace: { id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' },
      members: mockMembers,
    });

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/workspaces/ws-1/members') {
        return Promise.resolve({ data: { success: true, data: mockMembers } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } });
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true, data: {} } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    // 1. Click "Team Settings" sidebar nav to open modal
    fireEvent.click(screen.getByRole('button', { name: /Team Settings/i }));

    await waitFor(() => {
      expect(screen.getByText('WORKSPACE MEMBERS.')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    // 2. Invite a new user
    fireEvent.change(screen.getByPlaceholderText(/Enter user email/i), {
      target: { value: 'john@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workspaces/ws-1/members', {
        email: 'john@example.com',
        role: 'member',
      });
    });

    // 3. Change member role (Sarah Connor)
    const select = screen.getAllByRole('combobox')[1];
    fireEvent.change(select, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/workspaces/ws-1/members/user-456', {
        role: 'admin',
      });
    });

    // 4. Remove member (Sarah Connor)
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(api.delete).toHaveBeenCalledWith('/workspaces/ws-1/members/user-456');
    });
  });

  it('Loads notifications list, renders bell badge count, and handles mark as read / mark all as read triggers', async () => {
    const mockNotifications = [
      { id: 'notif-1', userId: 'user-123', sender: { id: 'user-456', name: 'Sarah Connor', email: 'sarah@forgeboard.com' }, type: 'task_assigned', title: 'Task Assigned', message: 'Sarah assigned you a task', read: false, link: '/workspaces/ws-1/projects/p-1', createdAt: new Date().toISOString() },
      { id: 'notif-2', userId: 'user-123', sender: { id: 'user-456', name: 'Sarah Connor', email: 'sarah@forgeboard.com' }, type: 'task_assigned', title: 'Task Assigned', message: 'Sarah assigned you another task', read: false, link: '/workspaces/ws-1/projects/p-1', createdAt: new Date().toISOString() },
    ];

    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' }],
      activeWorkspace: { id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' },
      members: [],
    });

    useNotificationStore.setState({
      notifications: mockNotifications,
      isLoading: false,
      error: null,
    });

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/notifications') {
        return Promise.resolve({ data: { success: true, data: mockNotifications } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    // 1. Verify notification count badge is rendered on bell button
    expect(screen.getByText('2')).toBeInTheDocument();

    // 2. Click the bell to open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Sarah assigned you a task')).toBeInTheDocument();
    });

    // 3. Mark single notification as read
    fireEvent.click(screen.getByText('Sarah assigned you a task'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/notif-1/read');
    });

    // Reset calls & toggle dropdown back open
    vi.mocked(api.put).mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    // 4. Click Mark all read
    fireEvent.click(screen.getByText(/Mark all read/i));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/read-all');
    });
  });

  it('Navigates to Activity History page and displays workspace activity logs correctly', async () => {
    const mockActivities = [
      { id: 'act-1', workspaceId: 'ws-1', action: 'Created Task "Design Mockups"', description: 'Sarah Connor created task', user: { id: 'user-456', name: 'Sarah Connor', email: 'sarah@forgeboard.com' }, createdAt: new Date().toISOString() },
    ];

    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' }],
      activeWorkspace: { id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-123' },
      members: [],
    });

    useActivityStore.setState({
      activities: mockActivities,
      isLoading: false,
      error: null,
    });

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/workspaces/ws-1/activity') {
        return Promise.resolve({ data: { success: true, data: mockActivities } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    // 1. Test navigation trigger on AppLayout
    const { unmount } = render(
      <MemoryRouter initialEntries={['/workspaces/ws-1']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/workspaces/:workspaceId" element={<div>Home Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Activity History/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/ws-1/activity');

    unmount();

    // 2. Test ActivityPage rendering directly
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/activity']}>
        <Routes>
          <Route path="/workspaces/:workspaceId/activity" element={<ActivityPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ACTIVITY HISTORY.')).toBeInTheDocument();
      expect(screen.getByText('Created Task "Design Mockups"')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor created task')).toBeInTheDocument();
      expect(screen.getByText(/Executed by: Sarah Connor/i)).toBeInTheDocument();
    });
  });

  it('Restricts project, board, and column creations and task deletion UI for regular members', async () => {
    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-other' }],
      activeWorkspace: { id: 'ws-1', name: 'Northstar Studio', ownerId: 'user-other' },
      members: [
        { id: 'user-123', name: 'Abhishek Sharma', email: 'member@forgeboard.com', role: 'member' },
      ],
    });

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    // Verify "+ NEW" project and board triggers are NOT shown
    expect(screen.queryByRole('button', { name: /New Project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Board/i })).not.toBeInTheDocument();
    // But workspace creator button is shown
    expect(screen.getByRole('button', { name: /New Workspace/i })).toBeInTheDocument();
  });
});
