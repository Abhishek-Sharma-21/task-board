import { create } from 'zustand';
import { api } from '../../api/client';
import type { Board, BoardColumn, Task } from '../../schemas';

interface BoardState {
  boards: Board[];
  activeBoard: Board | null;
  columns: BoardColumn[];
  tasksByColumn: Record<string, Task[]>;
  activeUsers: Array<{ id: string; name: string }>;
  isLoading: boolean;
  error: string | null;

  fetchBoards: (projectId: string) => Promise<void>;
  selectBoard: (boardId: string) => Promise<void>;
  setActiveUsers: (users: Array<{ id: string; name: string }>) => void;
  createBoard: (projectId: string, name: string, description?: string) => Promise<Board>;
  fetchColumnsAndTasks: (boardId: string) => Promise<void>;
  
  createColumn: (boardId: string, name: string) => Promise<void>;
  updateColumn: (boardId: string, columnId: string, name: string) => Promise<void>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, orderedIds: string[]) => Promise<void>;

  createTask: (
    boardId: string,
    payload: {
      title: string;
      description?: string;
      columnId: string;
      priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
      assigneeId?: string;
      labels?: string[];
      dueDate?: string;
    }
  ) => Promise<void>;
  updateTask: (
    taskId: string,
    payload: {
      title?: string;
      description?: string;
      priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
      assigneeId?: string | null;
      labels?: string[];
      dueDate?: string | null;
      expectedVersion: number;
    }
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Optimistic & real-time drag-and-drop triggers
  moveTaskOptimistic: (taskId: string, fromColId: string, toColId: string, newPosition: number) => void;
  moveTaskDb: (taskId: string, toColumnId: string, toPosition: number, expectedVersion: number) => Promise<void>;
  setTasksForColumn: (columnId: string, tasks: Task[]) => void;
  addOrUpdateTaskRealtime: (task: Task) => void;
  deleteTaskRealtime: (taskId: string) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  columns: [],
  tasksByColumn: {},
  activeUsers: [],
  isLoading: false,
  error: null,

  setActiveUsers: (users) => set({ activeUsers: users }),

  fetchBoards: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: true; data: Board[] }>(`/projects/${projectId}/boards`);
      const boards = response.data.data;
      set({ boards, isLoading: false });
      // Set the first board as active if none is active
      if (boards.length > 0 && !get().activeBoard) {
        await get().selectBoard(boards[0].id);
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch boards', isLoading: false });
    }
  },

  selectBoard: async (boardId) => {
    const current = get().boards.find((b) => b.id === boardId) || null;
    set({ activeBoard: current, error: null });
    if (current) {
      await get().fetchColumnsAndTasks(boardId);
    }
  },

  createBoard: async (projectId, name, description = '') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ success: true; data: Board }>(`/projects/${projectId}/boards`, {
        name,
        description,
      });
      const board = response.data.data;
      set((state) => ({
        boards: [...state.boards, board],
        activeBoard: board,
        isLoading: false,
      }));
      await get().fetchColumnsAndTasks(board.id);
      return board;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create board', isLoading: false });
      throw err;
    }
  },

  fetchColumnsAndTasks: async (boardId) => {
    set({ isLoading: true, error: null });
    try {
      const [colRes, taskRes] = await Promise.all([
        api.get<{ success: true; data: BoardColumn[] }>(`/boards/${boardId}/columns`),
        api.get<{ success: true; data: Task[] }>(`/boards/${boardId}/tasks`),
      ]);

      const columns = colRes.data.data;
      const tasks = taskRes.data.data;

      // Group tasks by columnId
      const tasksByColumn: Record<string, Task[]> = {};
      columns.forEach((col) => {
        tasksByColumn[col.id] = [];
      });
      tasks.forEach((task) => {
        if (tasksByColumn[task.columnId]) {
          tasksByColumn[task.columnId].push(task);
        }
      });

      // Sort lists by task position
      Object.keys(tasksByColumn).forEach((colId) => {
        tasksByColumn[colId].sort((a, b) => a.position - b.position);
      });

      set({ columns, tasksByColumn, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to load columns/tasks', isLoading: false });
    }
  },

  createColumn: async (boardId, name) => {
    set({ error: null });
    try {
      await api.post(`/boards/${boardId}/columns`, { name });
      await get().fetchColumnsAndTasks(boardId);
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create column' });
    }
  },

  updateColumn: async (boardId, columnId, name) => {
    set({ error: null });
    try {
      await api.put(`/boards/${boardId}/columns/${columnId}`, { name });
      await get().fetchColumnsAndTasks(boardId);
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update column' });
    }
  },

  deleteColumn: async (boardId, columnId) => {
    set({ error: null });
    try {
      await api.delete(`/boards/${boardId}/columns/${columnId}`);
      await get().fetchColumnsAndTasks(boardId);
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete column' });
    }
  },

  reorderColumns: async (boardId, orderedIds) => {
    // Optimistic columns update
    const previousCols = [...get().columns];
    const reordered = orderedIds
      .map((id) => previousCols.find((c) => c.id === id))
      .filter((c): c is BoardColumn => !!c);
    set({ columns: reordered });

    try {
      await api.put(`/boards/${boardId}/columns/reorder`, { orderedIds });
    } catch (err: any) {
      set({ columns: previousCols, error: err.response?.data?.message || 'Failed to reorder columns' });
    }
  },

  createTask: async (boardId, payload) => {
    set({ error: null });
    try {
      const response = await api.post<{ success: true; data: Task }>(`/boards/${boardId}/tasks`, payload);
      const task = response.data.data;
      
      set((state) => {
        const colId = task.columnId;
        const currentList = state.tasksByColumn[colId] || [];
        return {
          tasksByColumn: {
            ...state.tasksByColumn,
            [colId]: [...currentList, task].sort((a, b) => a.position - b.position),
          },
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create task' });
      throw err;
    }
  },

  updateTask: async (taskId, payload) => {
    set({ error: null });
    try {
      const response = await api.put<{ success: true; data: Task }>(`/tasks/${taskId}`, payload);
      const updated = response.data.data;

      set((state) => {
        const colId = updated.columnId;
        const list = state.tasksByColumn[colId] || [];
        return {
          tasksByColumn: {
            ...state.tasksByColumn,
            [colId]: list.map((t) => (t.id === taskId ? updated : t)),
          },
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update task' });
      throw err;
    }
  },

  deleteTask: async (taskId) => {
    set({ error: null });
    // Find task to know which list to delete from optimistically
    let targetTask: Task | null = null;
    const tasksByColumn = { ...get().tasksByColumn };

    Object.keys(tasksByColumn).forEach((colId) => {
      const found = tasksByColumn[colId].find((t) => t.id === taskId);
      if (found) {
        targetTask = found;
        tasksByColumn[colId] = tasksByColumn[colId].filter((t) => t.id !== taskId);
      }
    });

    if (!targetTask) return;
    const previousState = { ...get().tasksByColumn };
    set({ tasksByColumn });

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err: any) {
      set({ tasksByColumn: previousState, error: err.response?.data?.message || 'Failed to delete task' });
    }
  },

  moveTaskOptimistic: (taskId, fromColId, toColId, newPosition) => {
    const state = get();
    const sourceList = [...(state.tasksByColumn[fromColId] || [])];
    const destList = fromColId === toColId ? sourceList : [...(state.tasksByColumn[toColId] || [])];

    const taskIndex = sourceList.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const [draggedTask] = sourceList.splice(taskIndex, 1);
    const updatedTask = { ...draggedTask, columnId: toColId };

    // Insert task into destination list
    destList.splice(newPosition, 0, updatedTask);

    // Re-index positions
    const finalSourceList = sourceList.map((t, idx) => ({ ...t, position: idx }));
    const finalDestList = destList.map((t, idx) => ({ ...t, position: idx }));

    set((state) => ({
      tasksByColumn: {
        ...state.tasksByColumn,
        [fromColId]: finalSourceList,
        [toColId]: finalDestList,
      },
    }));
  },

  moveTaskDb: async (taskId, toColumnId, toPosition, expectedVersion) => {
    set({ error: null });
    try {
      const response = await api.put<{ success: true; data: Task }>(`/tasks/${taskId}/move`, {
        toColumnId,
        toPosition,
        expectedVersion,
      });

      // Update task in state with final version returned by server
      const updated = response.data.data;
      set((state) => {
        const colId = updated.columnId;
        const list = state.tasksByColumn[colId] || [];
        return {
          tasksByColumn: {
            ...state.tasksByColumn,
            [colId]: list.map((t) => (t.id === taskId ? updated : t)),
          },
        };
      });
    } catch (err: any) {
      // Fetch fresh board state on conflict / failure to roll back accurately
      const activeBoard = get().activeBoard;
      if (activeBoard) {
        await get().fetchColumnsAndTasks(activeBoard.id);
      }
      set({ error: err.response?.data?.message || 'Task reordering failed. Board refreshed.' });
    }
  },

  setTasksForColumn: (columnId, tasks) => {
    set((state) => ({
      tasksByColumn: {
        ...state.tasksByColumn,
        [columnId]: tasks,
      },
    }));
  },

  addOrUpdateTaskRealtime: (task) => {
    set((state) => {
      const colId = task.columnId;
      // 1. Remove task from any existing list (in case it was moved by another user)
      const tasksByColumn = { ...state.tasksByColumn };
      Object.keys(tasksByColumn).forEach((cid) => {
        tasksByColumn[cid] = tasksByColumn[cid].filter((t) => t.id !== task.id);
      });

      // 2. Insert into the target column list
      const targetList = [...(tasksByColumn[colId] || [])];
      
      // Look for a placement index matching position or push
      const existingIdx = targetList.findIndex((t) => t.id === task.id);
      if (existingIdx !== -1) {
        targetList[existingIdx] = task;
      } else {
        targetList.push(task);
      }
      
      targetList.sort((a, b) => a.position - b.position);
      tasksByColumn[colId] = targetList;

      return { tasksByColumn };
    });
  },

  deleteTaskRealtime: (taskId) => {
    set((state) => {
      const tasksByColumn = { ...state.tasksByColumn };
      Object.keys(tasksByColumn).forEach((cid) => {
        tasksByColumn[cid] = tasksByColumn[cid].filter((t) => t.id !== taskId);
      });
      return { tasksByColumn };
    });
  },
}));
