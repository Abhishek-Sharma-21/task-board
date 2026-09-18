import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useBoardStore } from './boardStore';
import { useAuthStore } from '../auth/authStore';
import { useCommentStore } from '../comments/commentStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { getSocket, connectSocket } from '../../sockets/socket';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { TaskDrawer } from './TaskDrawer';
import { TaskWorkspaceModal } from './TaskWorkspaceModal';
import { TaskListView } from './TaskListView';
import { ManageColumnsModal } from './ManageColumnsModal';
import { KanbanFeatureGuide } from './KanbanFeatureGuide';
import { CompletedTasksDrawer } from './CompletedTasksDrawer';
import type { Task, Comment, BoardColumn as ColumnType } from '../../schemas';
import { Search, Frown, SlidersHorizontal, LayoutGrid, List, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();

  const currentUser = useAuthStore((state) => state.user);
  const { members } = useWorkspaceStore();
  const userMember = members.find((m) => m.id === currentUser?.id);
  const userRole = userMember ? userMember.role : 'member';
  const canManageColumns = userRole === 'owner' || userRole === 'admin';
  const activeBoard = useBoardStore((state) => state.activeBoard);
  const columns = useBoardStore((state) => state.columns);
  const tasksByColumn = useBoardStore((state) => state.tasksByColumn);
  const isLoading = useBoardStore((state) => state.isLoading);
  const selectBoard = useBoardStore((state) => state.selectBoard);
  const createColumn = useBoardStore((state) => state.createColumn);
  const renameColumn = useBoardStore((state) => state.updateColumn);
  const deleteColumn = useBoardStore((state) => state.deleteColumn);
  const createTask = useBoardStore((state) => state.createTask);
  const moveTaskOptimistic = useBoardStore((state) => state.moveTaskOptimistic);
  const moveTaskDb = useBoardStore((state) => state.moveTaskDb);

  const activeUsers = useBoardStore((state) => state.activeUsers);
  const setActiveUsers = useBoardStore((state) => state.setActiveUsers);
  const fetchColumnsAndTasks = useBoardStore((state) => state.fetchColumnsAndTasks);
  const addOrUpdateTaskRealtime = useBoardStore((state) => state.addOrUpdateTaskRealtime);
  const deleteTaskRealtime = useBoardStore((state) => state.deleteTaskRealtime);
  const addCommentRealtime = useCommentStore((state) => state.addCommentRealtime);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const selectedTaskIdRef = React.useRef<string | null>(selectedTaskId);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  // New Screenshot Control States
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title' | 'createdAt'>('dueDate');
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Completed Tasks Drawer state
  const [isAllTasksDrawerOpen, setIsAllTasksDrawerOpen] = useState(false);
  const [allTasksColumn, setAllTasksColumn] = useState<ColumnType | null>(null);
  const [allTasksList, setAllTasksList] = useState<Task[]>([]);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Reset filters when boardId changes
  useEffect(() => {
    setSearchQuery('');
    setSelectedColumnId('All');
    setSelectedPriority('All');
    setSelectedAssigneeId('All');
    setSelectedTag('All');
    setSelectedProject('All');
    setIsFilterDropdownOpen(false);
    setHiddenColumnIds([]);
    setCurrentPage(1);
  }, [boardId]);

  // Extract unique tags and projects from all current board tasks
  const uniqueTags = React.useMemo(() => {
    const allTasks = Object.values(tasksByColumn).flat();
    return Array.from(new Set(allTasks.flatMap((t) => t.labels || [])));
  }, [tasksByColumn]);



  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedColumnId !== 'All' ||
    selectedPriority !== 'All' ||
    selectedAssigneeId !== 'All' ||
    selectedTag !== 'All' ||
    selectedProject !== 'All';

  // Task Priority Rank Map
  const priorityRank: Record<string, number> = { Urgent: 1, High: 2, Medium: 3, Low: 4 };

  const sortTasksList = React.useCallback(
    (tasksList: Task[]) => {
      return [...tasksList].sort((a, b) => {
        if (sortBy === 'dueDate') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === 'priority') {
          const rankA = priorityRank[a.priority] || 99;
          const rankB = priorityRank[b.priority] || 99;
          return rankA - rankB;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'createdAt') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
    },
    [sortBy]
  );

  const filteredTasksByColumn = React.useMemo(() => {
    const result: Record<string, Task[]> = {};

    Object.keys(tasksByColumn).forEach((colId) => {
      if (selectedColumnId !== 'All' && colId !== selectedColumnId) {
        result[colId] = [];
        return;
      }

      const rawFiltered = (tasksByColumn[colId] || []).filter((task) => {
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(query);
          const matchDesc = task.description?.toLowerCase().includes(query) || false;
          if (!matchTitle && !matchDesc) return false;
        }

        if (selectedPriority !== 'All' && task.priority !== selectedPriority) {
          return false;
        }

        if (selectedAssigneeId === 'unassigned') {
          if (
            task.assignees && task.assignees.length > 0
          ) {
            return false;
          }
        } else if (selectedAssigneeId !== 'All' && !(task.assignees || []).some(a => a.id === selectedAssigneeId)) {
          return false;
        }

        if (selectedTag !== 'All' && !(task.labels || []).includes(selectedTag)) {
          return false;
        }

        if (selectedProject !== 'All' && task.projectName?.toLowerCase() !== selectedProject.toLowerCase()) {
          return false;
        }

        return true;
      });

      result[colId] = sortTasksList(rawFiltered);
    });

    return result;
  }, [tasksByColumn, searchQuery, selectedColumnId, selectedPriority, selectedAssigneeId, selectedTag, selectedProject, sortTasksList]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedColumnId('All');
    setSelectedPriority('All');
    setSelectedAssigneeId('All');
    setSelectedTag('All');
    setSelectedProject('All');
  };



  const filteredTasksCount = React.useMemo(() => {
    return Object.values(filteredTasksByColumn).flat().length;
  }, [filteredTasksByColumn]);

  const visibleColumns = React.useMemo(() => {
    return columns.filter((col) => !hiddenColumnIds.includes(col.id));
  }, [columns, hiddenColumnIds]);

  const handleToggleColumnVisibility = (colId: string) => {
    setHiddenColumnIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleViewAllTasks = (column: ColumnType, tasks: Task[]) => {
    setAllTasksColumn(column);
    setAllTasksList(tasks);
    setIsAllTasksDrawerOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (boardId) {
      selectBoard(boardId);
    }
  }, [boardId, selectBoard]);

  // Real-time WebSockets synchronization
  useEffect(() => {
    if (!boardId || !currentUser) return;

    const socket = connectSocket() || getSocket();

    const joinRoom = () => {
      socket?.emit?.('joinBoard', { boardId, name: currentUser.name });
    };

    if (socket?.connected) {
      joinRoom();
    } else {
      socket?.once?.('connect', joinRoom);
    }

    const handleTaskUpdated = (data?: { task: Task }) => {
      if (data?.task) addOrUpdateTaskRealtime(data.task);
    };

    const handleTaskMoved = (data?: { task: Task }) => {
      if (data?.task) addOrUpdateTaskRealtime(data.task);
    };

    const handleTaskDeleted = (data?: { taskId: string }) => {
      if (data?.taskId) deleteTaskRealtime(data.taskId);
    };

    const handlePresence = (data?: { users: any[] } | any[]) => {
      const usersList = Array.isArray(data) ? data : data?.users;
      if (usersList) setActiveUsers(usersList);
    };

    const handleBoardUpdated = (data?: { boardId: string }) => {
      if (!data || data.boardId === boardId) fetchColumnsAndTasks(boardId);
    };

    const handleCommentCreated = (data?: { taskId: string; comment: Comment }) => {
      if (data?.taskId && data?.comment) {
        addCommentRealtime(data.taskId, data.comment);
      }
    };

    socket?.on?.('task:updated', handleTaskUpdated);
    socket?.on?.('task:moved', handleTaskMoved);
    socket?.on?.('task:deleted', handleTaskDeleted);
    socket?.on?.('board:presence', handlePresence);
    socket?.on?.('board:updated', handleBoardUpdated);
    socket?.on?.('comment:created', handleCommentCreated);

    return () => {
      socket?.emit?.('leaveBoard', { boardId });
      socket?.off?.('task:updated', handleTaskUpdated);
      socket?.off?.('task:moved', handleTaskMoved);
      socket?.off?.('task:deleted', handleTaskDeleted);
      socket?.off?.('board:presence', handlePresence);
      socket?.off?.('board:updated', handleBoardUpdated);
      socket?.off?.('comment:created', handleCommentCreated);
      setActiveUsers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, currentUser]);

  const findColumnOfTask = (taskId: string): string | null => {
    for (const colId of Object.keys(tasksByColumn)) {
      if (tasksByColumn[colId].some((t) => t.id === taskId)) {
        return colId;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (hasActiveFilters) return;
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (hasActiveFilters) return;
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const fromColId = findColumnOfTask(taskId);
    if (!fromColId) return;

    let toColId = overId;
    let targetIndex = 0;

    const isOverTask = findColumnOfTask(overId);
    if (isOverTask) {
      toColId = isOverTask;
      const targetTasks = tasksByColumn[toColId] || [];
      targetIndex = targetTasks.findIndex((t) => t.id === overId);
    } else {
      const targetTasks = tasksByColumn[toColId] || [];
      targetIndex = targetTasks.length;
    }

    const activeTasksList = tasksByColumn[fromColId] || [];
    const task = activeTasksList.find((t) => t.id === taskId);
    if (!task) return;

    if (fromColId !== toColId || activeTasksList.findIndex((t) => t.id === taskId) !== targetIndex) {
      const currentIdx = activeTasksList.findIndex((t) => t.id === taskId);
      let finalIndex = targetIndex;
      if (fromColId === toColId && currentIdx < targetIndex) {
        finalIndex = Math.max(0, targetIndex - 1);
      }

      moveTaskOptimistic(taskId, fromColId, toColId, finalIndex);
      await moveTaskDb(taskId, toColId, finalIndex, task.version);
    }
  };



  if (isLoading && !activeBoard) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-widest text-text-muted">
        Syncing board state...
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className="border-2 border-border bg-surface p-8 text-center rounded-sm">
        <h2 className="text-xl font-black uppercase text-text-primary tracking-tight">
          No Board Selected
        </h2>
        <p className="mt-2 text-sm text-text-muted font-medium">
          Create or select a board from the sidebar to start tracking tasks.
        </p>
      </div>
    );
  }

  const activeDraggedTask = activeTaskId
    ? Object.values(tasksByColumn)
        .flat()
        .find((t) => t.id === activeTaskId)
    : null;

  const activeDrawerTask = selectedTaskId
    ? Object.values(tasksByColumn)
        .flat()
        .find((t) => t.id === selectedTaskId) || null
    : null;

  return (
    <div className="space-y-6 flex flex-col h-full font-sans">
      {/* Top Header: Breadcrumbs, Board Title & Column Management Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center space-x-2 text-[10px] uppercase font-mono tracking-widest text-text-muted mb-1">
            <span>PROJECT</span>
            <span>/</span>
            <span className="text-primary font-bold">PRODUCT</span>
          </div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary leading-none">
              {activeBoard.name}
            </h1>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-primary-light text-primary px-2 py-0.5 rounded-sm border border-primary/20">
              KANBAN BOARD
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center space-x-3 w-full md:w-auto justify-end">
          {/* Active Members Online Indicator */}
          {activeUsers.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden mr-2">
              {activeUsers.map((user) => {
                const initials = user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const isMe = user.id === currentUser?.id;
                return (
                  <div
                    key={user.id}
                    title={`${user.name}${isMe ? ' (You)' : ''}`}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold font-mono border border-border text-white select-none ${
                      isMe ? 'bg-primary' : 'bg-surface-active text-text-secondary'
                    }`}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>
          )}

          {/* Manage Columns Button */}
          <button
            onClick={() => setIsManageColumnsOpen(true)}
            className="border border-border bg-surface hover:bg-surface-hover text-text-primary text-xs font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-sm transition-colors flex items-center space-x-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">Manage Columns</span>
          </button>

          {/* Add Column Button */}
          {canManageColumns && (
            <button
              onClick={() => setIsManageColumnsOpen(true)}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-2 rounded-sm transition-colors flex items-center space-x-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Column</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Controls Bar: Search & Filter, View Toggle, Sort & Pagination */}
      <div className="bg-surface-hover/60 border border-border p-3.5 rounded-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between font-mono text-xs">
        {/* Point 1: Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="SEARCH TASKS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border hover:border-primary/50 focus:border-primary text-xs font-mono py-1.5 pl-8 pr-3 text-text-primary focus:outline-none rounded-sm transition-colors"
            />
          </div>

          {/* Filters Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`border text-xs font-mono uppercase tracking-wider px-3.5 py-1.5 rounded-sm transition-colors flex items-center space-x-2 font-bold ${
                hasActiveFilters
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  {[
                    searchQuery !== '',
                    selectedColumnId !== 'All',
                    selectedPriority !== 'All',
                    selectedAssigneeId !== 'All',
                    selectedTag !== 'All',
                  ].filter(Boolean).length}
                </span>
              )}
              <span>{isFilterDropdownOpen ? '▴' : '▾'}</span>
            </button>

            {/* Filter Dropdown Popover */}
            {isFilterDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2.5rem)] bg-surface-elevated border-2 border-border p-4 rounded-sm shadow-theme-xl z-35 space-y-4 font-sans text-left">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                    FILTERS.
                  </span>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="text-[9px] font-mono text-text-muted hover:text-primary transition-colors uppercase font-bold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="filter-column" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Status / Column
                  </label>
                  <select
                    id="filter-column"
                    value={selectedColumnId}
                    onChange={(e) => setSelectedColumnId(e.target.value)}
                    className="w-full bg-input border border-border text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
                  >
                    <option value="All">All Columns</option>
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="filter-priority" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Priority
                  </label>
                  <select
                    id="filter-priority"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-input border border-border text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="filter-assignee" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Assignee
                  </label>
                  <select
                    id="filter-assignee"
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full bg-input border border-border text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
                  >
                    <option value="All">All Assignees</option>
                    {members
                      .filter((m) => m && m.name != null)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name.toUpperCase()}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="filter-tag" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Tag / Label
                  </label>
                  <select
                    id="filter-tag"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full bg-input border border-border text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
                  >
                    <option value="All">All Tags</option>
                    {uniqueTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Point 2 View Toggle + Point 3 Sort & Pagination */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          {/* Point 2: View Toggle Pills */}
          <div className="flex items-center space-x-2 border border-border bg-surface p-0.5 rounded-sm">
            <span className="text-[10px] text-text-muted font-bold px-2">View:</span>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 text-xs font-bold rounded-xs transition-colors flex items-center space-x-1 ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-bold rounded-xs transition-colors flex items-center space-x-1 ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <List className="w-3 h-3" />
              <span>List</span>
            </button>
          </div>

          {/* Point 3: Sort by Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-text-muted text-[10px] uppercase tracking-wider">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-input border border-border text-xs font-bold text-text-secondary py-1 px-2.5 rounded-sm focus:outline-none focus:border-primary uppercase"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="createdAt">Created Date</option>
            </select>
          </div>

          {/* Point 3: Total tasks indicator & Pagination */}
          <div className="flex items-center space-x-3 border-l border-border pl-3">
            <span className="text-[10px] font-bold text-text-secondary uppercase">
              Total {filteredTasksCount} tasks
            </span>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-1 text-xs font-mono">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 text-text-muted hover:text-text-primary border border-border rounded-sm disabled:opacity-40"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="px-2 py-0.5 bg-primary text-white font-bold rounded-sm text-[10px]">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 text-text-muted hover:text-text-primary border border-border rounded-sm"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-[9px] text-text-faint uppercase tracking-wider">Active Filters:</span>
          {searchQuery !== '' && (
            <span className="bg-surface-active border border-border text-text-secondary text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1">
              <span>Query: "{searchQuery}"</span>
              <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-primary font-bold">&times;</button>
            </span>
          )}
          {selectedColumnId !== 'All' && (
            <span className="bg-surface-active border border-border text-text-secondary text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1">
              <span>Column: {columns.find((c) => c.id === selectedColumnId)?.name}</span>
              <button onClick={() => setSelectedColumnId('All')} className="text-text-muted hover:text-primary font-bold">&times;</button>
            </span>
          )}
          {selectedPriority !== 'All' && (
            <span className="bg-surface-active border border-border text-text-secondary text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1">
              <span>Priority: {selectedPriority}</span>
              <button onClick={() => setSelectedPriority('All')} className="text-text-muted hover:text-primary font-bold">&times;</button>
            </span>
          )}
          {selectedAssigneeId !== 'All' && (
            <span className="bg-surface-active border border-border text-text-secondary text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1">
              <span>Assignee: {members.find((m) => m.id === selectedAssigneeId)?.name}</span>
              <button onClick={() => setSelectedAssigneeId('All')} className="text-text-muted hover:text-primary font-bold">&times;</button>
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-[9px] text-primary hover:text-primary-hover font-bold uppercase transition-colors"
          >
            [Clear All]
          </button>
        </div>
      )}

      {/* Main Content Area: ListView or Kanban Board */}
      {viewMode === 'list' ? (
        <div className="flex-1 overflow-x-auto">
          <TaskListView
            tasks={Object.values(filteredTasksByColumn).flat()}
            columns={columns}
            onOpenTask={(task) => setSelectedTaskId(task.id)}
          />
        </div>
      ) : hasActiveFilters && filteredTasksCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border bg-surface rounded-sm max-w-md mx-auto my-8">
          <Frown className="w-12 h-12 text-text-faint mb-4" />
          <h3 className="text-sm font-bold uppercase text-text-primary tracking-wider mb-2">No Tasks Found</h3>
          <p className="text-xs text-text-muted font-medium mb-6">Try changing your search query or adjusting your filters.</p>
          <button
            onClick={handleClearFilters}
            className="bg-surface-active hover:bg-surface-hover text-text-muted text-xs font-mono uppercase tracking-wider px-6 py-2.5 border border-border rounded-sm transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Kanban Board Columns Wrapper */
        <div className="flex-1 overflow-x-auto pb-4">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex space-x-4 items-start min-h-[400px]">
              {visibleColumns.map((col) => (
                <BoardColumn
                  key={col.id}
                  column={col}
                  tasks={filteredTasksByColumn[col.id] || []}
                  canManageColumns={canManageColumns}
                  isDragDisabled={hasActiveFilters}
                  onAddTask={(title) => createTask(activeBoard.id, { title, columnId: col.id })}
                  onDeleteColumn={() => deleteColumn(activeBoard.id, col.id)}
                  onRenameColumn={(name) => renameColumn(activeBoard.id, col.id, name)}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  onViewAllTasks={handleViewAllTasks}
                />
              ))}
            </div>

            <DragOverlay>
              {activeDraggedTask ? <TaskCard task={activeDraggedTask} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Bottom Explanatory Feature Cards (Points 1-5 in user screenshot) */}
      <KanbanFeatureGuide />

      {/* Manage Columns Popover / Modal */}
      <ManageColumnsModal
        isOpen={isManageColumnsOpen}
        onClose={() => setIsManageColumnsOpen(false)}
        columns={columns}
        hiddenColumnIds={hiddenColumnIds}
        onToggleVisibility={handleToggleColumnVisibility}
        onAddColumn={(name) => createColumn(activeBoard.id, name)}
        onDeleteColumn={(id) => deleteColumn(activeBoard.id, id)}
        canManageColumns={canManageColumns}
      />

      {/* Side Details Drawer */}
      {!isWorkspaceModalOpen && (
        <TaskDrawer
          task={activeDrawerTask}
          onClose={() => setSelectedTaskId(null)}
          onExpandWorkspace={() => setIsWorkspaceModalOpen(true)}
        />
      )}

      {/* Centered Split-View Workspace Modal */}
      <TaskWorkspaceModal
        task={activeDrawerTask}
        isOpen={isWorkspaceModalOpen}
        onClose={() => {
          setIsWorkspaceModalOpen(false);
          setSelectedTaskId(null);
        }}
        onMinimizeToDrawer={() => setIsWorkspaceModalOpen(false)}
      />

      {/* All Tasks Drawer */}
      <CompletedTasksDrawer
        isOpen={isAllTasksDrawerOpen}
        column={allTasksColumn}
        tasks={allTasksList}
        onClose={() => {
          setIsAllTasksDrawerOpen(false);
          setAllTasksColumn(null);
          setAllTasksList([]);
        }}
        onTaskClick={(task) => setSelectedTaskId(task.id)}
        members={members}
      />
    </div>
  );
};
