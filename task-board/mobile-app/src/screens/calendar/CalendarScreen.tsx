import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Task } from '../../types';
import { formatFullDate, priorityColors } from '../../utils/dates';
import api from '../../api/client';

export default function CalendarScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspace, currentDate]);

  const fetchTasks = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/tasks/due`);
      setTasks(data.data || []);
    } catch {}
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    return { daysInMonth, startDayOfWeek, year, month };
  };

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due.toISOString().split('T')[0] === dateStr;
    });
  };

  const { daysInMonth, startDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Month Navigation */}
      <View style={[styles.monthNav, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month - 1))}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {monthNames[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month + 1))}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <View style={[styles.calendarCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        {/* Day Names */}
        <View style={styles.dayNamesRow}>
          {dayNames.map((d) => (
            <Text key={d} style={[styles.dayName, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>

        {/* Days */}
        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = getTasksForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isToday && { backgroundColor: colors.primary + '20', borderRadius: 8 },
                  isSelected && { backgroundColor: colors.primary, borderRadius: 8 },
                ]}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: isSelected ? '#FFFFFF' : isToday ? colors.primary : colors.textPrimary },
                    isToday && styles.dayTextBold,
                  ]}
                >
                  {day}
                </Text>
                {dayTasks.length > 0 && !isSelected && (
                  <View style={styles.taskDots}>
                    {dayTasks.slice(0, 3).map((_, i) => (
                      <View key={i} style={[styles.taskDot, { backgroundColor: colors.primary }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Date Tasks */}
      {selectedDate && (
        <View style={styles.tasksSection}>
          <Text style={[styles.tasksTitle, { color: colors.textPrimary }]}>
            {formatFullDate(selectedDate)} - {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            data={selectedTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const pColor = priorityColors[item.priority] || priorityColors.low;
              return (
                <TouchableOpacity
                  style={[styles.taskCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                >
                  <View style={[styles.priorityDot, { backgroundColor: pColor.text }]} />
                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.noTasks, { color: colors.textMuted }]}>No tasks for this date</Text>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  monthTitle: { fontSize: 17, fontWeight: '600' },
  calendarCard: { margin: 16, borderRadius: 12, borderWidth: 1, padding: 12 },
  dayNamesRow: { flexDirection: 'row', marginBottom: 8 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  dayText: { fontSize: 14 },
  dayTextBold: { fontWeight: '700' },
  taskDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  taskDot: { width: 4, height: 4, borderRadius: 2 },
  tasksSection: { flex: 1, padding: 16 },
  tasksTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  taskCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8, gap: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, fontWeight: '500', flex: 1 },
  noTasks: { fontSize: 14, textAlign: 'center', paddingTop: 20 },
});
