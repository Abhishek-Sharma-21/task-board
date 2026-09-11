import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../src/features/auth/authStore';
import { useWorkspaceStore } from '../src/features/workspaces/workspaceStore';
import { useProjectStore } from '../src/features/projects/projectStore';
import { useBoardStore } from '../src/features/boards/boardStore';
import { BoardPage } from '../src/features/boards/BoardPage';
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

// Mock Socket.IO client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../src/sockets/socket', () => ({
  getSocket: () => mockSocket,
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

describe('Kanban Board Search & Filtering tests', () => {
  const mockColumns = [
    { id: 'col-todo', name: 'TODO', boardId: 'board-123', position: 0 },
    { id: 'col-done', name: 'DONE', boardId: 'board-123', position: 1 },
  ];

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Setup Express API routes',
      description: 'create routes and middlewares',
      projectId: 'p-123',
      boardId: 'board-123',
      columnId: 'col-todo',
      position: 0,
      priority: 'High',
      assigneeId: 'user-123',
      labels: ['backend', 'core'],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'Design UI Layout mockups',
      description: 'construct layout pages',
      projectId: 'p-123',
      boardId: 'board-123',
      columnId: 'col-done',
      position: 0,
      priority: 'Low',
      assigneeId: 'user-456',
      labels: ['design'],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Set mock authenticated user
    useAuthStore.setState({
      user: { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@forgeboard.com' },
      accessToken: 'token-123',
      isInitialized: true,
    });

    // Reset store states
    useWorkspaceStore.setState({
      activeWorkspace: { id: 'ws-123', name: 'Northstar Studio', ownerId: 'user-123' },
      members: [
        { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@forgeboard.com', role: 'owner' },
        { id: 'user-456', name: 'Sarah Connor', email: 'sarah@forgeboard.com', role: 'member' },
      ],
    });

    useProjectStore.setState({
      activeProject: { id: 'p-123', name: 'Launch Control', workspaceId: 'ws-123' },
    });

    useBoardStore.setState({
      boards: [{ id: 'board-123', name: 'Sprint 04', projectId: 'p-123', createdBy: 'user-123', description: 'sprint board' }],
      activeBoard: { id: 'board-123', name: 'Sprint 04', projectId: 'p-123', createdBy: 'user-123', description: 'sprint board' },
      columns: mockColumns,
      tasksByColumn: {
        'col-todo': [mockTasks[0]],
        'col-done': [mockTasks[1]],
      },
      isLoading: false,
    });

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/boards/board-123/columns') {
        return Promise.resolve({ data: { success: true, data: mockColumns } });
      }
      if (url === '/boards/board-123/tasks') {
        return Promise.resolve({ data: { success: true, data: mockTasks } });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('Searches tasks by title and description correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-123/projects/p-123/boards/board-123']}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/projects/:projectId/boards/:boardId"
            element={<BoardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Initial render displays all tasks
    await waitFor(() => {
      expect(screen.getByText('Setup Express API routes')).toBeInTheDocument();
      expect(screen.getByText('Design UI Layout mockups')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('SEARCH TASKS...');

    // Type query matching title of first task
    fireEvent.change(searchInput, { target: { value: 'Express' } });

    await waitFor(() => {
      expect(screen.getByText('Setup Express API routes')).toBeInTheDocument();
      expect(screen.queryByText('Design UI Layout mockups')).not.toBeInTheDocument();
    });

    // Type query matching description of second task
    fireEvent.change(searchInput, { target: { value: 'pages' } });

    await waitFor(() => {
      expect(screen.queryByText('Setup Express API routes')).not.toBeInTheDocument();
      expect(screen.getByText('Design UI Layout mockups')).toBeInTheDocument();
    });

    // Type query matching nothing
    fireEvent.change(searchInput, { target: { value: 'nonexistent-query' } });

    await waitFor(() => {
      expect(screen.getByText('No Tasks Found')).toBeInTheDocument();
      expect(screen.queryByText('Setup Express API routes')).not.toBeInTheDocument();
      expect(screen.queryByText('Design UI Layout mockups')).not.toBeInTheDocument();
    });

    // Clear search using clear button in empty state
    fireEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));

    await waitFor(() => {
      expect(screen.getByText('Setup Express API routes')).toBeInTheDocument();
      expect(screen.getByText('Design UI Layout mockups')).toBeInTheDocument();
    });
  });

  it('Filters tasks by Priority, Assignee, and Tag/Label correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-123/projects/p-123/boards/board-123']}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/projects/:projectId/boards/:boardId"
            element={<BoardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Setup Express API routes')).toBeInTheDocument();
    });

    // Toggle Filters menu open
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));

    // 1. Filter by Priority
    const prioritySelect = screen.getByLabelText('Priority');
    fireEvent.change(prioritySelect, { target: { value: 'High' } });

    await waitFor(() => {
      expect(screen.getByText('Setup Express API routes')).toBeInTheDocument();
      expect(screen.queryByText('Design UI Layout mockups')).not.toBeInTheDocument();
    });

    // Reset priority
    fireEvent.change(prioritySelect, { target: { value: 'All' } });

    // 2. Filter by Assignee (Sarah Connor: user-456)
    const assigneeSelect = screen.getByLabelText('Assignee');
    fireEvent.change(assigneeSelect, { target: { value: 'user-456' } });

    await waitFor(() => {
      expect(screen.queryByText('Setup Express API routes')).not.toBeInTheDocument();
      expect(screen.getByText('Design UI Layout mockups')).toBeInTheDocument();
    });

    // Reset assignee
    fireEvent.change(assigneeSelect, { target: { value: 'All' } });

    // 3. Filter by Tag/Label
    const tagSelect = screen.getByLabelText('Tag / Label');
    fireEvent.change(tagSelect, { target: { value: 'backend' } });

    await waitFor(() => {
      expect(screen.getByText('Setup Express API routes')).toBeInTheDocument();
      expect(screen.queryByText('Design UI Layout mockups')).not.toBeInTheDocument();
    });

    // 4. Test Multiple Filters combined (Tag=backend AND Priority=Low -> yields empty result)
    fireEvent.change(prioritySelect, { target: { value: 'Low' } });

    await waitFor(() => {
      expect(screen.getByText('No Tasks Found')).toBeInTheDocument();
    });
  });
});
