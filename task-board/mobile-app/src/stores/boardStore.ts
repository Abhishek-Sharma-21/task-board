import { create } from 'zustand';
import api from '../api/client';
import { Board, BoardColumn, Task } from '../types';

interface BoardState {
  boards: Board[];
  activeBoard: Board | null;
  columns: BoardColumn[];
  tasksByColumn: Record<string, Task[]>;
  isLoading: boolean;
  fetchBoards: (projectId: string) => Promise<void>;
  setActiveBoard: (board: Board) => void;
  fetchColumns: (boardId: string) => Promise<void>;
  fetchTasks: (boardId: string) => Promise<void>;
  createBoard: (projectId: string, name: string, description?: string) => Promise<Board>;
  createTask: (boardId: string, columnId: string, title: string, data?: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  moveTask: (taskId: string, targetColumnId: string, targetPosition: number, expectedVersion: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  archiveTask: (taskId: string) => Promise<void>;
  restoreTask: (taskId: string) => Promise<void>;
  addColumn: (boardId: string, name: string) => Promise<BoardColumn>;
  updateColumn: (columnId: string, name: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  columns: [],
  tasksByColumn: {},
  isLoading: false,

  fetchBoards: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/projects/${projectId}/boards`);
      set({ boards: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveBoard: (board) => set({ activeBoard: board }),

  fetchColumns: async (boardId: string) => {
    try {
      const { data } = await api.get(`/boards/${boardId}/columns`);
      set({ columns: data.data });
    } catch {}
  },

  fetchTasks: async (boardId: string) => {
    try {
      const { data } = await api.get(`/boards/${boardId}/tasks`);
      const tasks: Task[] = data.data;
      const grouped: Record<string, Task[]> = {};
      get().columns.forEach((col) => {
        grouped[col.id] = tasks
          .filter((t) => t.columnId === col.id && !t.isArchived)
          .sort((a, b) => a.position - b.position);
      });
      set({ tasksByColumn: grouped });
    } catch {}
  },

  createBoard: async (projectId: string, name: string, description?: string) => {
    const { data } = await api.post(`/projects/${projectId}/boards`, { name, description });
    const board = data.data;
    set((state) => ({ boards: [...state.boards, board] }));
    return board;
  },

  createTask: async (boardId: string, columnId: string, title: string, taskData?: Partial<Task>) => {
    try {
      const { data } = await api.post(`/boards/${boardId}/tasks`, {
        title,
        columnId,
        ...taskData,
      });
      const task = data.data;
      set((state) => ({
        tasksByColumn: {
          ...state.tasksByColumn,
          [columnId]: [...(state.tasksByColumn[columnId] || []), task].sort(
            (a, b) => a.position - b.position
          ),
        },
      }));
      return task;
    } catch (error) {
      throw error;
    }
  },

  updateTask: async (taskId: string, taskData: Partial<Task>) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, taskData);
      const updatedTask = data.data;
      set((state) => {
        const newTasksByColumn = { ...state.tasksByColumn };
        for (const colId of Object.keys(newTasksByColumn)) {
          newTasksByColumn[colId] = newTasksByColumn[colId].map((t) =>
            t.id === taskId ? { ...t, ...updatedTask } : t
          );
        }
        return { tasksByColumn: newTasksByColumn };
      });
    } catch (error) {
      throw error;
    }
  },

  moveTask: async (taskId: string, targetColumnId: string, targetPosition: number, expectedVersion: number) => {
    const prev = get().tasksByColumn;
    let movedTask: Task | undefined;
    let sourceColumnId: string | undefined;
    for (const [colId, tasks] of Object.entries(prev)) {
      const found = tasks.find((t) => t.id === taskId);
      if (found) {
        movedTask = found;
        sourceColumnId = colId;
        break;
      }
    }
    if (!movedTask || !sourceColumnId) return;

    const newTasksByColumn = { ...prev };
    newTasksByColumn[sourceColumnId] = newTasksByColumn[sourceColumnId].filter((t) => t.id !== taskId);
    const updatedTask = { ...movedTask, columnId: targetColumnId, position: targetPosition };
    newTasksByColumn[targetColumnId] = [
      ...newTasksByColumn[targetColumnId].filter((t) => t.id !== taskId),
      updatedTask,
    ].sort((a, b) => a.position - b.position);
    set({ tasksByColumn: newTasksByColumn });

    try {
      await api.put(`/tasks/${taskId}/move`, {
        toColumnId: targetColumnId,
        toPosition: targetPosition,
        expectedVersion,
      });
    } catch {
      set({ tasksByColumn: prev });
    }
  },

  deleteTask: async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      set((state) => {
        const newTasksByColumn = { ...state.tasksByColumn };
        for (const colId of Object.keys(newTasksByColumn)) {
          newTasksByColumn[colId] = newTasksByColumn[colId].filter((t) => t.id !== taskId);
        }
        return { tasksByColumn: newTasksByColumn };
      });
    } catch (error) {
      throw error;
    }
  },

  archiveTask: async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/archive`);
      set((state) => {
        const newTasksByColumn = { ...state.tasksByColumn };
        for (const colId of Object.keys(newTasksByColumn)) {
          newTasksByColumn[colId] = newTasksByColumn[colId].filter((t) => t.id !== taskId);
        }
        return { tasksByColumn: newTasksByColumn };
      });
    } catch (error) {
      throw error;
    }
  },

  restoreTask: async (taskId: string) => {
    try {
      const { data } = await api.post(`/tasks/${taskId}/restore`);
      const task = data.data;
      set((state) => ({
        tasksByColumn: {
          ...state.tasksByColumn,
          [task.columnId]: [...(state.tasksByColumn[task.columnId] || []), task].sort(
            (a, b) => a.position - b.position
          ),
        },
      }));
    } catch (error) {
      throw error;
    }
  },

  addColumn: async (boardId: string, name: string) => {
    const { data } = await api.post(`/boards/${boardId}/columns`, { name });
    const column = data.data;
    set((state) => ({
      columns: [...state.columns, column],
      tasksByColumn: { ...state.tasksByColumn, [column.id]: [] },
    }));
    return column;
  },

  updateColumn: async (columnId: string, name: string) => {
    await api.put(`/boards/${get().activeBoard?.id}/columns/${columnId}`, { name });
    set((state) => ({
      columns: state.columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
    }));
  },

  deleteColumn: async (columnId: string) => {
    await api.delete(`/boards/${get().activeBoard?.id}/columns/${columnId}`);
    set((state) => {
      const newTasksByColumn = { ...state.tasksByColumn };
      delete newTasksByColumn[columnId];
      return {
        columns: state.columns.filter((c) => c.id !== columnId),
        tasksByColumn: newTasksByColumn,
      };
    });
  },

  reorderColumns: async (boardId: string, columnIds: string[]) => {
    await api.put(`/boards/${boardId}/columns/reorder`, { columnIds });
    set((state) => ({
      columns: columnIds
        .map((id, index) => {
          const col = state.columns.find((c) => c.id === id);
          return col ? { ...col, position: index } : null;
        })
        .filter(Boolean) as BoardColumn[],
    }));
  },
}));
