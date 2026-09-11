import React, { useState, useMemo } from 'react';
import type { Task } from '../../schemas';
import { TaskDrawer } from '../boards/TaskDrawer';

interface ProjectCalendarViewProps {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}

export const ProjectCalendarView: React.FC<ProjectCalendarViewProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('All');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

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
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      if (filterPriority !== 'All' && task.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterPriority]);

  // Group tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    filteredTasks.forEach((task) => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
          <h3 className="text-lg font-black uppercase text-text-primary">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center space-x-1 font-mono text-xs">
            <button
              onClick={handlePrevMonth}
              className="px-2 py-1 bg-surface-hover border border-border rounded-xs hover:border-primary font-bold text-text-primary"
            >
              &lt;
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-1 bg-surface-hover border border-border rounded-xs hover:border-primary font-bold text-text-primary uppercase"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="px-2 py-1 bg-surface-hover border border-border rounded-xs hover:border-primary font-bold text-text-primary"
            >
              &gt;
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
