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

describe('Kanban Board Page & Stores integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set mock authenticated user
    useAuthStore.setState({
      user: { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@taskboard.com' },
      accessToken: 'token-123',
      isInitialized: true,
    });

    // Reset stores states
    useWorkspaceStore.setState({
      activeWorkspace: { id: 'ws-123', name: 'Northstar Studio', ownerId: 'user-123' },
    });

    useProjectStore.setState({
      activeProject: { id: 'p-123', name: 'Launch Control', workspaceId: 'ws-123' },
    });

    useBoardStore.setState({
      boards: [{ id: 'board-123', name: 'Sprint 04', projectId: 'p-123', createdBy: 'user-123', description: 'sprint board' }],
      activeBoard: null,
      columns: [],
      tasksByColumn: {},
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('Fetches columns and tasks and renders columns with items count', async () => {
    const mockColumns = [
      { id: 'col-todo', name: 'TODO', boardId: 'board-123', position: 0 },
      { id: 'col-done', name: 'DONE', boardId: 'board-123', position: 1 },
    ];
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Database Schema Push',
        description: 'implement migrations',
        projectId: 'p-123',
        boardId: 'board-123',
        columnId: 'col-todo',
        position: 0,
        priority: 'High',
        labels: [],
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/boards/board-123/columns') {
        return Promise.resolve({ data: { success: true, data: mockColumns } });
      }
      if (url === '/boards/board-123/tasks') {
        return Promise.resolve({ data: { success: true, data: mockTasks } });
      }
      return Promise.reject(new Error('Not found'));
    });

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

    // Verify columns header labels exist
    await waitFor(() => {
      expect(screen.getByText('TODO')).toBeInTheDocument();
      expect(screen.getByText('DONE')).toBeInTheDocument();
      expect(screen.getByText('Database Schema Push')).toBeInTheDocument();
    });
  });

  it('Submits a new task in a column successfully', async () => {
    const mockColumns = [{ id: 'col-todo', name: 'TODO', boardId: 'board-123', position: 0 }];
    const mockTasks: any[] = [];
    const mockNewTask = {
      id: 'task-2',
      title: 'Write unit tests',
      columnId: 'col-todo',
      projectId: 'p-123',
      boardId: 'board-123',
      position: 0,
      priority: 'Medium',
      labels: [],
      version: 0,
    };

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/boards/board-123/columns') {
        return Promise.resolve({ data: { success: true, data: mockColumns } });
      }
      if (url === '/boards/board-123/tasks') {
        return Promise.resolve({ data: { success: true, data: mockTasks } });
      }
      return Promise.reject(new Error('Not found'));
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, data: mockNewTask },
    });

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
      expect(screen.getByText('TODO')).toBeInTheDocument();
    });

    // Click trigger and type title
    fireEvent.click(screen.getAllByText(/Add Task/i)[0]);
    fireEvent.change(screen.getByPlaceholderText(/ENTER TASK TITLE/i), {
      target: { value: 'Write unit tests' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/boards/board-123/tasks', {
        title: 'Write unit tests',
        columnId: 'col-todo',
      });
    });
  });
});
