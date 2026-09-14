import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { Task } from '../types';

interface CalendarScreenProps {
  tasks: Task[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelectTask: (task: Task) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  tasks = [],
  isLoading = false,
  onRefresh,
  onSelectTask,
}) => {
  const { colors } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'To Do' | 'In Progress' | 'Done'>('All');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter tasks by priority & status
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'All') {
        const tStatus = t.status?.toLowerCase() || '';
        if (statusFilter === 'Done' && !tStatus.includes('done') && !tStatus.includes('complete')) return false;
        if (statusFilter === 'In Progress' && !tStatus.includes('progress') && !tStatus.includes('doing')) return false;
        if (statusFilter === 'To Do' && (tStatus.includes('done') || tStatus.includes('progress'))) return false;
      }
      return true;
    });
  }, [tasks, priorityFilter, statusFilter]);

  // Group tasks by date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      if (isNaN(d.getTime())) return;
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    return map;
  }, [filteredTasks]);

  // Build calendar day cells
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
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

  // Active selected day in month (default to today if in current month)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayStr);
  const [selectedProject, setSelectedProject] = useState<string>('All');

  const uniqueProjects = useMemo(() => {
    const names = Array.from(new Set(tasks.map((t) => t.projectName).filter(Boolean))) as string[];
    return ['All', ...names];
  }, [tasks]);

  const rawDayTasks = tasksByDate[selectedDateKey] || [];
  const selectedDayTasks = useMemo(() => {
    if (selectedProject === 'All') return rawDayTasks;
    return rawDayTasks.filter((t) => t.projectName?.toLowerCase() === selectedProject.toLowerCase());
  }, [rawDayTasks, selectedProject]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.red} /> : undefined
      }
    >
      <Header
        title="Calendar"
        subtitle="Manage tasks by due dates"
      />

      {/* Project Filter Pill Bar */}
      {uniqueProjects.length > 1 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Filter Calendar by Project ({uniqueProjects.length - 1} Available)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }}
            contentContainerStyle={{ gap: 7 }}
          >
            {uniqueProjects.map((proj) => {
              const isActive = selectedProject === proj;
              const count = proj === 'All' ? tasks.length : tasks.filter((t) => t.projectName?.toLowerCase() === proj.toLowerCase()).length;
              return (
                <TouchableOpacity
                  key={proj}
                  style={{
                    borderWidth: 1,
                    borderRadius: 9999,
                    paddingHorizontal: 13,
                    paddingVertical: 6,
                    backgroundColor: isActive ? colors.blue : colors.surface,
                    borderColor: isActive ? colors.blue : colors.border,
                  }}
                  onPress={() => setSelectedProject(proj)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 10, color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }}>
                    📁 {proj === 'All' ? 'All Projects' : proj} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Month & Year Navigation Bar */}
      <View style={styles.monthBar}>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {monthNames[month]} {year}
        </Text>

        <View style={styles.monthControls}>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.todayBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handleToday}
            activeOpacity={0.7}
          >
            <Text style={[styles.todayBtnText, { color: colors.redLight }]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, { color: colors.text }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['All', 'High', 'Medium', 'Low'] as const).map((pr) => {
          const isActive = priorityFilter === pr;
          return (
            <TouchableOpacity
              key={pr}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? colors.red : colors.surface,
                  borderColor: isActive ? colors.red : colors.border,
                },
              ]}
              onPress={() => setPriorityFilter(pr)}
            >
              <Text style={[styles.filterPillText, { color: isActive ? '#ffffff' : colors.textMuted }]}>
                Priority: {pr}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Days Grid Header */}
      <View style={[styles.weekHeader, { backgroundColor: colors.surface2 }]}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <Text key={i} style={[styles.weekDayText, { color: colors.textMuted }]}>{day}</Text>
        ))}
      </View>

      {/* Month Days Grid */}
      <View style={styles.daysGrid}>
        {calendarDays.map((cell) => {
          if (!cell.dayNumber) {
            return <View key={cell.dateKey} style={styles.emptyCell} />;
          }

          const dayTaskCount = (tasksByDate[cell.dateKey] || []).length;
          const isSelected = cell.dateKey === selectedDateKey;
          const isToday = cell.dateKey === todayStr;
          const isOverdue = new Date(cell.dateKey) < new Date(todayStr) && dayTaskCount > 0;

          return (
            <TouchableOpacity
              key={cell.dateKey}
              style={[
                styles.dayCell,
                {
                  backgroundColor: isSelected
                    ? colors.red
                    : isOverdue
                    ? colors.redBg
                    : colors.surface,
                  borderColor: isSelected
                    ? colors.red
                    : isToday
                    ? colors.red
                    : isOverdue
                    ? colors.red
                    : colors.border,
                },
              ]}
              onPress={() => setSelectedDateKey(cell.dateKey)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dayNum,
                  {
                    color: isSelected
                      ? '#ffffff'
                      : isToday
                      ? colors.redLight
                      : colors.text,
                    fontWeight: isSelected || isToday ? '800' : '600',
                  },
                ]}
              >
                {cell.dayNumber}
              </Text>

              {dayTaskCount > 0 && (
                <View style={[styles.taskBadge, { backgroundColor: isOverdue ? colors.redDark : colors.red }]}>
                  <Text style={styles.badgeCountText}>{dayTaskCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tasks on Selected Date */}
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Tasks on {selectedDateKey} <Text style={{ color: colors.textMuted }}>({selectedDayTasks.length})</Text>
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.red} />
        </View>
      ) : selectedDayTasks.length > 0 ? (
        <View style={styles.taskList}>
          {selectedDayTasks.map((t) => (
            <TaskCard
              key={t.id}
              title={t.title}
              description={t.description}
              priority={(t.priority as any) || 'Medium'}
              dueDate={t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}
              assigneeName={t.assignee?.name || (t.assigneeId ? 'Assigned' : undefined)}
              status={t.status}
              isCompleted={t.isCompleted}
              projectName={t.projectName}
              onPress={() => onSelectTask(t)}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks due on this date.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  monthBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: {
    fontSize: 18,
    lineHeight: 18,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 6,
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: 36,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  emptyCell: {
    width: '13.2%',
    height: 48,
  },
  dayCell: {
    width: '13.2%',
    height: 48,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNum: {
    fontSize: 12,
  },
  taskBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCountText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  sectionHeading: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  taskList: {
    gap: 8,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyState: {
    padding: 24,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
});
