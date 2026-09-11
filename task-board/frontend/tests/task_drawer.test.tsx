import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../src/features/auth/authStore';
import { useWorkspaceStore } from '../src/features/workspaces/workspaceStore';
import { useProjectStore } from '../src/features/projects/projectStore';
import { useBoardStore } from '../src/features/boards/boardStore';
import { useCommentStore } from '../src/features/comments/commentStore';
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
const mockListeners = new Map<string, Function>();
const mockSocket = {
  on: vi.fn((event, callback) => {
    mockListeners.set(event, callback);
  }),
  off: vi.fn((event) => {
    mockListeners.delete(event);
  }),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../src/sockets/socket', () => ({
  getSocket: () => mockSocket,
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

describe('Task Drawer & Comments UI tests', () => {
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
      members: [
        { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@taskboard.com', role: 'owner' },
      ],
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

    useCommentStore.setState({
      commentsByTask: {},
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('Opens drawer on task card click, renders detail inputs, and submits comment', async () => {
    const mockColumns = [{ id: 'col-todo', name: 'TODO', boardId: 'board-123', position: 0 }];
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Database Schema Design',
        description: 'implement Postgres migrations',
        projectId: 'p-123',
        boardId: 'board-123',
        columnId: 'col-todo',
        position: 0,
        priority: 'High',
        labels: [],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const mockComments = [
      {
        id: 'comment-1',
        taskId: 'task-1',
        user: { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@taskboard.com' },
        body: 'Already pushed to Neon server.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const mockNewComment = {
      id: 'comment-2',
      taskId: 'task-1',
      user: { id: 'user-123', name: 'Abhishek Sharma', email: 'owner@taskboard.com' },
      body: 'Verified working.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/boards/board-123/columns') {
        return Promise.resolve({ data: { success: true, data: mockColumns } });
      }
      if (url === '/boards/board-123/tasks') {
        return Promise.resolve({ data: { success: true, data: mockTasks } });
      }
      if (url === '/tasks/task-1/comments') {
        return Promise.resolve({ data: { success: true, data: mockComments } });
      }
      if (url === '/tasks/task-1/activity') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.reject(new Error('Not found'));
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, data: mockNewComment },
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

    // 1. Wait for task card to render and click it
    await waitFor(() => {
      expect(screen.getByText('Database Schema Design')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Database Schema Design'));

    // 2. Verify drawer slide-over contents open
    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Database Schema Design')).toBeInTheDocument();
      expect(screen.getByDisplayValue('implement Postgres migrations')).toBeInTheDocument();
      expect(screen.getByText('Already pushed to Neon server.')).toBeInTheDocument();
    });

    // 3. Post a comment
    fireEvent.change(screen.getByPlaceholderText(/ADD TO THE DISCUSSION/i), {
      target: { value: 'Verified working.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post Comment/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tasks/task-1/comments', {
        body: 'Verified working.',
      });
      expect(screen.getByText('Verified working.')).toBeInTheDocument();
    });
  });

  it('Handles board presence list, user typing, and stop typing real-time indicator triggers', async () => {
    const mockColumns = [{ id: 'col-todo', name: 'TODO', boardId: 'board-123', position: 0 }];
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Database Schema Design',
        description: 'implement Postgres migrations',
        projectId: 'p-123',
        boardId: 'board-123',
        columnId: 'col-todo',
        position: 0,
        priority: 'High',
        labels: [],
        version: 1,
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
      if (url === '/tasks/task-1/comments' || url === '/tasks/task-1/activity') {
        return Promise.resolve({ data: { success: true, data: [] } });
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

    // Click task card to open drawer
    await waitFor(() => {
      expect(screen.getByText('Database Schema Design')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Database Schema Design'));

    // Trigger board presence list
    const presenceCallback = mockListeners.get('board:presence');
    expect(presenceCallback).toBeDefined();
    presenceCallback!([
      { id: 'user-123', name: 'Abhishek Sharma' },
      { id: 'user-456', name: 'Sarah Connor' }
    ]);

    // Check presence list initials rendered in board header
    await waitFor(() => {
      expect(screen.getByTitle('Abhishek Sharma (You)')).toBeInTheDocument();
      expect(screen.getByTitle('Sarah Connor')).toBeInTheDocument();
    });

    // Verify typing emission on input change
    const commentInput = screen.getByPlaceholderText(/ADD TO THE DISCUSSION/i);
    fireEvent.change(commentInput, { target: { value: 'Working on ' } });
    expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
      boardId: 'board-123',
      taskId: 'task-1',
      name: 'Abhishek Sharma',
    });

    // Simulate receiving userTyping from Sarah Connor
    const userTypingCallback = mockListeners.get('userTyping');
    expect(userTypingCallback).toBeDefined();
    userTypingCallback!({ taskId: 'task-1', userId: 'user-456', name: 'Sarah Connor' });

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor is typing...')).toBeInTheDocument();
    });

    // Simulate receiving userStoppedTyping from Sarah Connor
    const userStoppedTypingCallback = mockListeners.get('userStoppedTyping');
    expect(userStoppedTypingCallback).toBeDefined();
    userStoppedTypingCallback!({ taskId: 'task-1', userId: 'user-456' });

    await waitFor(() => {
      expect(screen.queryByText('Sarah Connor is typing...')).not.toBeInTheDocument();
    });
  });

  it('Refreshes columns and tasks on board:updated socket event', async () => {
    const mockColumns = [{ id: 'col-todo', name: 'TODO', boardId: 'board-123', position: 0 }];
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Database Schema Design',
        description: 'implement Postgres migrations',
        projectId: 'p-123',
        boardId: 'board-123',
        columnId: 'col-todo',
        position: 0,
        priority: 'High',
        labels: [],
        version: 1,
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

    // Initial render
    await waitFor(() => {
      expect(screen.getByText('Database Schema Design')).toBeInTheDocument();
    });

    // Verify GET requests were called initially
    expect(api.get).toHaveBeenCalledWith('/boards/board-123/columns');
    expect(api.get).toHaveBeenCalledWith('/boards/board-123/tasks');

    // Reset get mocks tracking
    vi.mocked(api.get).mockClear();

    // Trigger board:updated event
    const boardUpdatedCallback = mockListeners.get('board:updated');
    expect(boardUpdatedCallback).toBeDefined();
    
    // Simulate board updated socket broadcast
    boardUpdatedCallback!();

    // Verify it triggers refetching columns and tasks
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/boards/board-123/columns');
      expect(api.get).toHaveBeenCalledWith('/boards/board-123/tasks');
    });
  });
});
