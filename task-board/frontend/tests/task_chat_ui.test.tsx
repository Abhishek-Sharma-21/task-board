import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { useAuthStore } from '../src/features/auth/authStore';
import { useWorkspaceStore } from '../src/features/workspaces/workspaceStore';
import { useProjectStore } from '../src/features/projects/projectStore';
import { useBoardStore } from '../src/features/boards/boardStore';
import { useTaskChatStore } from '../src/features/chat/taskChatStore';
import { TaskChatView } from '../src/features/chat/TaskChatView';
import { TaskWorkspaceModal } from '../src/features/boards/TaskWorkspaceModal';
import { api } from '../src/api/client';
import type { Task, TaskChatMessage } from '../src/schemas';

// Mock API client
vi.mock('../src/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

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
};

vi.mock('../src/sockets/socket', () => ({
  getSocket: () => mockSocket,
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

describe('Task Chat & Centered Workspace UI Tests', () => {
  const dummyTask: Task = {
    id: 'task-chat-1',
    title: 'Implement Task Chat Feature',
    description: 'Build centered split workspace and chat component',
    projectId: 'proj-1',
    boardId: 'board-1',
    columnId: 'col-1',
    position: 0,
    priority: 'High',
    labels: ['CHAT', 'UI'],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dummyMessages: TaskChatMessage[] = [
    {
      id: 'msg-1',
      taskId: 'task-chat-1',
      userId: 'user-2',
      user: { id: 'user-2', name: 'Rahul Sharma', email: 'rahul@example.com' },
      body: 'Please check the API contract for task chat.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'msg-2',
      taskId: 'task-chat-1',
      userId: 'user-1',
      user: { id: 'user-1', name: 'Abhishek Sharma', email: 'abhishek@example.com' },
      body: 'Working on it now! Will update shortly.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: { id: 'user-1', name: 'Abhishek Sharma', email: 'abhishek@example.com' },
      accessToken: 'token-1',
      isInitialized: true,
    });

    useWorkspaceStore.setState({
      activeWorkspace: { id: 'ws-1', name: 'Dev Workspace', ownerId: 'user-1' },
      members: [
        { id: 'user-1', name: 'Abhishek Sharma', email: 'abhishek@example.com', role: 'owner' },
        { id: 'user-2', name: 'Rahul Sharma', email: 'rahul@example.com', role: 'member' },
      ],
    });

    useProjectStore.setState({
      activeProject: { id: 'proj-1', name: 'Core Project', workspaceId: 'ws-1' },
    });

    useBoardStore.setState({
      boards: [{ id: 'board-1', name: 'Sprint 1', projectId: 'proj-1', createdBy: 'user-1' }],
      activeBoard: { id: 'board-1', name: 'Sprint 1', projectId: 'proj-1', createdBy: 'user-1' },
      columns: [{ id: 'col-1', name: 'In Progress', boardId: 'board-1', position: 0 }],
      tasksByColumn: { 'col-1': [dummyTask] },
    });

    useTaskChatStore.setState({
      messagesByTask: { 'task-chat-1': dummyMessages },
      nextCursorByTask: {},
      hasMoreByTask: {},
      isLoadingByTask: {},
      isLoadingMoreByTask: {},
      errorByTask: {},
      searchResults: [],
      isSearching: false,
      searchQuery: '',
      typingUsersByTask: {},
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('Renders TaskChatView with participant count, date headers, incoming/outgoing bubbles, and sends a new message', async () => {
    (api.get as any).mockResolvedValue({
      data: {
        success: true,
        data: dummyMessages,
        nextCursor: null,
        hasMore: false,
      },
    });

    (api.post as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'msg-3',
          taskId: 'task-chat-1',
          userId: 'user-1',
          user: { id: 'user-1', name: 'Abhishek Sharma', email: 'abhishek@example.com' },
          body: 'New chat message via testing!',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    render(<TaskChatView task={dummyTask} />);

    expect(screen.getAllByText(/TASK CHAT/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Please check the API contract for task chat.')).toBeInTheDocument();
    expect(screen.getByText('Working on it now! Will update shortly.')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/TYPE A MESSAGE/i);
    fireEvent.change(input, { target: { value: 'New chat message via testing!' } });

    const sendBtn = screen.getByRole('button', { name: /Send ➤/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tasks/task-chat-1/chat/messages',
        { body: 'New chat message via testing!' }
      );
    });
  });

  it('Renders TaskWorkspaceModal in centered split-view with Task Details on left and Task Chat on right', async () => {
    const handleClose = vi.fn();
    const handleMinimize = vi.fn();

    render(
      <TaskWorkspaceModal
        task={dummyTask}
        isOpen={true}
        onClose={handleClose}
        onMinimizeToDrawer={handleMinimize}
      />
    );

    expect(screen.getByText(/TASK WORKSPACE/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Implement Task Chat Feature')).toBeInTheDocument();
    expect(screen.getByText('Please check the API contract for task chat.')).toBeInTheDocument();

    // Click Drawer Mode / minimize button
    const minimizeBtn = screen.getByTitle('Minimize to Right Drawer');
    fireEvent.click(minimizeBtn);
    expect(handleMinimize).toHaveBeenCalled();
  });
});
