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
import type { Task, Comment } from '../../schemas';

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
  const selectedTaskIdRef = React.useRef<string | null>(selectedTaskId);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);
  const [newColName, setNewColName] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Reset filters when boardId changes
  useEffect(() => {
    setSearchQuery('');
    setSelectedColumnId('All');
    setSelectedPriority('All');
    setSelectedAssigneeId('All');
    setSelectedTag('All');
    setIsFilterDropdownOpen(false);
  }, [boardId]);

  // Extract unique tags from all current board tasks
  const uniqueTags = React.useMemo(() => {
    const allTasks = Object.values(tasksByColumn).flat();
    return Array.from(new Set(allTasks.flatMap((t) => t.labels || [])));
  }, [tasksByColumn]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedColumnId !== 'All' ||
    selectedPriority !== 'All' ||
    selectedAssigneeId !== 'All' ||
    selectedTag !== 'All';

  const filteredTasksByColumn = React.useMemo(() => {
    const result: Record<string, Task[]> = {};
    
    Object.keys(tasksByColumn).forEach((colId) => {
      // If we filtered by a specific column, and this isn't it, make it empty
      if (selectedColumnId !== 'All' && colId !== selectedColumnId) {
        result[colId] = [];
        return;
      }

      result[colId] = (tasksByColumn[colId] || []).filter((task) => {
        // 1. Search Query Match
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(query);
          const matchDesc = task.description?.toLowerCase().includes(query) || false;
          if (!matchTitle && !matchDesc) return false;
        }

        // 2. Priority Match
        if (selectedPriority !== 'All' && task.priority !== selectedPriority) {
          return false;
        }

        // 3. Assignee Match
        if (selectedAssigneeId === 'unassigned') {
          if (task.assigneeId !== null && task.assigneeId !== undefined && task.assigneeId !== '' && task.assigneeId !== 'unassigned') {
            return false;
          }
        } else if (selectedAssigneeId !== 'All' && task.assigneeId !== selectedAssigneeId) {
          return false;
        }

        // 4. Tag Match
        if (selectedTag !== 'All' && !(task.labels || []).includes(selectedTag)) {
          return false;
        }

        return true;
      });
    });

    return result;
  }, [tasksByColumn, searchQuery, selectedColumnId, selectedPriority, selectedAssigneeId, selectedTag]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedColumnId('All');
    setSelectedPriority('All');
    setSelectedAssigneeId('All');
    setSelectedTag('All');
  };

  const totalTasksCount = React.useMemo(() => {
    return Object.values(tasksByColumn).flat().length;
  }, [tasksByColumn]);

  const filteredTasksCount = React.useMemo(() => {
    return Object.values(filteredTasksByColumn).flat().length;
  }, [filteredTasksByColumn]);

  // Configure Sensors: activationConstraint is CRITICAL so clicks on TaskCards trigger onClick instead of dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

    // Connect socket
    connectSocket();
    const socket = getSocket();

    // Join board room
    socket.emit('joinBoard', { boardId, name: currentUser.name });

    // Handle incoming socket events
    socket.on('task:created', (task: Task) => {
      // The creator already applied this task via the API response in createTask().
      // Only other clients should insert it via the socket event.
      if (task.createdBy === currentUser?.id) return;
      addOrUpdateTaskRealtime(task);
    });

    socket.on('task:updated', (task: Task) => {
      addOrUpdateTaskRealtime(task);
    });

    socket.on('task:moved', (task: Task) => {
      addOrUpdateTaskRealtime(task);
    });

    socket.on('task:deleted', (data: { id: string }) => {
      deleteTaskRealtime(data.id);
      if (selectedTaskIdRef.current === data.id) {
        setSelectedTaskId(null);
      }
    });

    socket.on('board:presence', (users: Array<{ id: string; name: string }>) => {
      setActiveUsers(users);
    });

    socket.on('board:updated', () => {
      fetchColumnsAndTasks(boardId);
    });

    socket.on('comment:created', (comment: Comment) => {
      addCommentRealtime(comment.taskId, comment);
    });

    // Cleanup on unmount/re-effect
    return () => {
      socket.emit('leaveBoard', { boardId });
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('comment:created');
      socket.off('board:presence');
      socket.off('board:updated');
      setActiveUsers([]);
    };
  // NOTE: selectedTaskId intentionally excluded — it is UI state unrelated to the
  // socket connection. Including it caused listener re-registration on every drawer
  // open/close, which is the secondary cause of the temporary duplicate.
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

    // Check if dragged over another column directly or a task card inside a column
    let toColId = overId;
    let targetIndex = 0;

    const isOverTask = findColumnOfTask(overId);
    if (isOverTask) {
      toColId = isOverTask;
      const targetTasks = tasksByColumn[toColId] || [];
      targetIndex = targetTasks.findIndex((t) => t.id === overId);
    } else {
      // Over the column droppable directly
      const targetTasks = tasksByColumn[toColId] || [];
      targetIndex = targetTasks.length;
    }

    // Retrieve active task object to check expected version
    const activeTasksList = tasksByColumn[fromColId] || [];
    const task = activeTasksList.find((t) => t.id === taskId);
    if (!task) return;

    // If position or column changed
    if (fromColId !== toColId || activeTasksList.findIndex((t) => t.id === taskId) !== targetIndex) {
      // Adjust targetIndex boundings
      const currentIdx = activeTasksList.findIndex((t) => t.id === taskId);
      let finalIndex = targetIndex;
      if (fromColId === toColId && currentIdx < targetIndex) {
        // compensate for card removal in same column
        finalIndex = Math.max(0, targetIndex - 1);
      }

      // 1. Instantly trigger optimistic frontend movement
      moveTaskOptimistic(taskId, fromColId, toColId, finalIndex);

      // 2. Persist update on backend database
      await moveTaskDb(taskId, toColId, finalIndex, task.version);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim() || !boardId) return;
    await createColumn(boardId, newColName.trim());
    setNewColName('');
    setIsAddingCol(false);
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

  // Find dragged task details for overlay
  const activeDraggedTask = activeTaskId
    ? Object.values(tasksByColumn)
        .flat()
        .find((t) => t.id === activeTaskId)
    : null;

  // Track task selected for drawer
  const activeDrawerTask = selectedTaskId
    ? Object.values(tasksByColumn)
        .flat()
        .find((t) => t.id === selectedTaskId) || null
    : null;

  return (
    <div className="space-y-8 flex flex-col h-full">
      {/* Board Header details */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted block mb-1">
            Kanban Board
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-text-primary leading-none">
            {activeBoard.name}
          </h1>
          {activeBoard.description && (
            <p className="mt-1.5 text-xs text-text-muted font-medium">
              {activeBoard.description}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
          {/* Active Users Avatars */}
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
                      isMe ? 'bg-primary' : 'bg-surface-active'
                    }`}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Column button */}
          {isAddingCol ? (
            <form onSubmit={handleAddColumn} className="flex space-x-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="COLUMN NAME..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="bg-input border-2 border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary w-full md:w-48"
                autoFocus
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-sm"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCol(false)}
                className="bg-surface-active hover:bg-surface-hover text-text-muted text-[10px] font-bold uppercase tracking-wider px-4 py-2 border border-border rounded-sm"
              >
                X
              </button>
            </form>
          ) : (
            canManageColumns && (
              <button
                onClick={() => setIsAddingCol(true)}
                className="bg-surface-hover border-2 border-border hover:border-border-strong text-text-primary font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-sm transition-colors flex items-center space-x-1.5"
              >
                <span>+</span>
                <span>New Column</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t border-b border-border-subtle py-4 mb-2">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="SEARCH TASKS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border-input hover:border-border-strong focus:border-primary text-xs font-mono py-2 pl-9 pr-4 text-text-primary focus:outline-none rounded-sm transition-colors uppercase"
            />
          </div>

          {/* Filter dropdown toggle button */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`border text-xs font-mono uppercase tracking-wider px-4 py-2 rounded-sm transition-colors flex items-center space-x-2 font-bold ${
                hasActiveFilters
                  ? 'border-primary/30 bg-primary-light text-primary hover:bg-primary/15'
                  : 'border-border bg-surface-hover text-text-muted hover:text-text-primary hover:border-border-strong'
              }`}
            >
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono">
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
              <div className="absolute left-0 sm:left-auto right-0 sm:right-auto mt-2 w-72 max-w-[calc(100vw-2.5rem)] bg-surface-elevated border-2 border-border p-4 rounded-sm shadow-theme-xl z-35 space-y-4 font-sans text-left">
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

                {/* Status / Column filter */}
                <div className="space-y-1">
                  <label htmlFor="filter-column" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Status / Column
                  </label>
                  <select
                    id="filter-column"
                    value={selectedColumnId}
                    onChange={(e) => setSelectedColumnId(e.target.value)}
                    className="w-full bg-input border border-border-input text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
                  >
                    <option value="All">All Columns</option>
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority filter */}
                <div className="space-y-1">
                  <label htmlFor="filter-priority" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Priority
                  </label>
                  <select
                    id="filter-priority"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-input border border-border-input text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Assignee filter */}
                <div className="space-y-1">
                  <label htmlFor="filter-assignee" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Assignee
                  </label>
                  <select
                    id="filter-assignee"
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full bg-input border border-border-input text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
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

                {/* Tags filter */}
                <div className="space-y-1">
                  <label htmlFor="filter-tag" className="block text-[9px] uppercase font-mono tracking-wider text-text-muted">
                    Tag / Label
                  </label>
                  <select
                    id="filter-tag"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full bg-input border border-border-input text-xs font-bold text-text-secondary py-1.5 px-3 rounded-sm focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
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

        {/* Count Indicator */}
        {hasActiveFilters && (
          <div className="text-[10px] font-mono text-text-muted flex items-center space-x-2">
            <span>SHOWING {filteredTasksCount} OF {totalTasksCount} TASKS</span>
            <span className="text-primary animate-pulse font-bold">[FILTERED VIEW]</span>
          </div>
        )}
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-[9px] font-mono text-text-faint uppercase tracking-wider">
            Active Filters:
          </span>
          {searchQuery !== '' && (
            <span className="bg-surface-active border border-border text-text-secondary font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1.5">
              <span>Query: "{searchQuery}"</span>
              <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-primary font-bold font-mono">&times;</button>
            </span>
          )}
          {selectedColumnId !== 'All' && (
            <span className="bg-surface-active border border-border text-text-secondary font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1.5">
              <span>Column: {columns.find(c => c.id === selectedColumnId)?.name}</span>
              <button onClick={() => setSelectedColumnId('All')} className="text-text-muted hover:text-primary font-bold font-mono">&times;</button>
            </span>
          )}
          {selectedPriority !== 'All' && (
            <span className="bg-surface-active border border-border text-text-secondary font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1.5">
              <span>Priority: {selectedPriority}</span>
              <button onClick={() => setSelectedPriority('All')} className="text-text-muted hover:text-primary font-bold font-mono">&times;</button>
            </span>
          )}
          {selectedAssigneeId !== 'All' && (
            <span className="bg-surface-active border border-border text-text-secondary font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1.5">
              <span>Assignee: {members.find(m => m.id === selectedAssigneeId)?.name}</span>
              <button onClick={() => setSelectedAssigneeId('All')} className="text-text-muted hover:text-primary font-bold font-mono">&times;</button>
            </span>
          )}
          {selectedTag !== 'All' && (
            <span className="bg-surface-active border border-border text-text-secondary font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center space-x-1.5">
              <span>Tag: {selectedTag}</span>
              <button onClick={() => setSelectedTag('All')} className="text-text-muted hover:text-primary font-bold font-mono">&times;</button>
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-[9px] font-mono text-primary hover:text-primary-hover font-bold uppercase transition-colors"
          >
            [Clear All]
          </button>
        </div>
      )}

      {hasActiveFilters && filteredTasksCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border bg-surface rounded-sm max-w-md mx-auto my-12">
          <svg className="w-12 h-12 text-text-faint mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-bold uppercase text-text-primary tracking-wider mb-2">
            No Tasks Found
          </h3>
          <p className="text-xs text-text-muted font-medium mb-6">
            Try changing your search query or adjusting your filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="bg-surface-active hover:bg-surface-hover text-text-muted text-xs font-mono uppercase tracking-wider px-6 py-3 border border-border rounded-sm transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Columns Container Dnd Wrapper */
        <div className="flex-1 overflow-x-auto pb-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex space-x-4 items-start min-h-[500px]">
              {columns.map((col) => (
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
                />
              ))}
            </div>

            <DragOverlay>
              {activeDraggedTask ? (
                <TaskCard task={activeDraggedTask} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Side Details Drawer */}
      <TaskDrawer
        task={activeDrawerTask}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
};
