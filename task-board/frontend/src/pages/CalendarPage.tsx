import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../features/projects/projectStore';
import { useBoardStore } from '../features/boards/boardStore';
import { TaskDrawer } from '../features/boards/TaskDrawer';
import type { Task } from '../schemas';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseLocalDate, todayString } from '../utils/dates';

export const CalendarPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { projects, fetchProjects } = useProjectStore();
  const { fetchBoards, fetchColumnsAndTasks } = useBoardStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Fetch projects when workspace changes
  useEffect(() => {
    if (workspaceId) {
      fetchProjects(workspaceId);
    }
  }, [workspaceId, fetchProjects]);

  // Fetch boards for all projects and collect tasks
  useEffect(() => {
    const loadAllTasks = async () => {
      if (projects.length === 0) return;
      
      const allTasksCollected: Task[] = [];
      
      for (const project of projects) {
        try {
          await fetchBoards(project.id);
          // Get boards from store after fetch
          const currentBoards = useBoardStore.getState().boards;
          
          for (const board of currentBoards) {
            try {
              await fetchColumnsAndTasks(board.id);
              const currentTasks = useBoardStore.getState().tasksByColumn;
              const boardTasks = Object.values(currentTasks).flat();
              allTasksCollected.push(...boardTasks);
            } catch (err) {
              console.error(`Failed to fetch tasks for board ${board.id}:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch boards for project ${project.id}:`, err);
        }
      }
      
      setAllTasks(allTasksCollected);
    };
    
    loadAllTasks();
  }, [projects, fetchBoards, fetchColumnsAndTasks]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter tasks for calendar view
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (!task.dueDate) return false;
      if (filterPriority !== 'All' && task.priority !== filterPriority) return false;
      return true;
    });
  }, [allTasks, filterPriority]);

  // Group tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const todayStr = todayString();

    filteredTasks.forEach((task) => {
      if (!task.dueDate) return;
      const dateKey = parseLocalDate(task.dueDate);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });

    return { map, todayStr };
  }, [filteredTasks]);

  // Build calendar days array
  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dayNumber: null, dateKey: `prev-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateKey });
    }
    return cells;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  return (
    <div className="space-y-4 font-sans">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-4 rounded-sm">
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-black uppercase text-text-primary">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center space-x-1 font-mono text-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 bg-surface-hover border border-border rounded-xs hover:border-primary text-text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-1 bg-surface-hover border border-border rounded-xs hover:border-primary font-bold text-text-primary uppercase"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 bg-surface-hover border border-border rounded-xs hover:border-primary text-text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-[10px] uppercase text-text-muted">Priority:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-input border border-border text-text-primary py-1 px-2 rounded-xs font-bold uppercase"
          >
            <option value="All">ALL PRIORITIES</option>
            <option value="Low">LOW</option>
            <option value="Medium">MEDIUM</option>
            <option value="High">HIGH</option>
            <option value="Urgent">URGENT</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border bg-surface rounded-sm overflow-hidden">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-border bg-sidebar font-mono text-[10px] font-bold uppercase text-text-muted text-center py-2">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr gap-px bg-border">
          {calendarCells.map((cell) => {
            if (!cell.dayNumber) {
              return <div key={cell.dateKey} className="bg-surface/30 min-h-[100px] p-1"></div>;
            }

            const dayTasks = tasksByDate.map[cell.dateKey] || [];
            const isToday = cell.dateKey === tasksByDate.todayStr;

            return (
              <div
                key={cell.dateKey}
                className={`bg-surface min-h-[100px] p-1.5 flex flex-col justify-start transition-colors ${
                  isToday ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-1 font-mono text-[10px]">
                  <span className={`font-bold ${isToday ? 'text-primary font-black' : 'text-text-muted'}`}>
                    {cell.dayNumber}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[9px] font-bold text-text-faint bg-surface-active px-1 rounded-xs">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {dayTasks.map((task) => {
                    const isOverdue = new Date(cell.dateKey) < new Date(tasksByDate.todayStr);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-1 text-[10px] font-mono rounded-xs cursor-pointer truncate border transition-all ${
                          isOverdue
                            ? 'bg-danger/10 border-danger/40 text-danger font-bold'
                            : 'bg-surface-hover border-border hover:border-primary text-text-primary font-medium'
                        }`}
                        title={task.title}
                      >
                        <span className="truncate block">{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};
