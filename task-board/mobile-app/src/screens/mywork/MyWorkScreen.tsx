import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Task } from '../../types';
import { formatDate, isOverdue, priorityColors } from '../../utils/dates';
import api from '../../api/client';

type TabKey = 'today' | 'overdue' | 'upcoming' | 'waiting' | 'blocked' | 'completed';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: 'sunny-outline' },
  { key: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'waiting', label: 'Waiting', icon: 'hourglass-outline' },
  { key: 'blocked', label: 'Blocked', icon: 'ban-outline' },
  { key: 'completed', label: 'Done', icon: 'checkmark-circle-outline' },
];

export default function MyWorkScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/tasks`);
      setTasks(data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspace]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const filterTasks = (): Task[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (activeTab) {
      case 'today':
        return tasks.filter((t) => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return due >= today && due < tomorrow && !t.isArchived;
        });
      case 'overdue':
        return tasks.filter((t) => isOverdue(t.dueDate) && !t.isArchived);
      case 'upcoming':
        return tasks.filter((t) => {
          if (!t.dueDate) return false;
          return new Date(t.dueDate) > now && !t.isArchived;
        });
      case 'waiting':
        return tasks.filter((t) => {
          const col = (t as any).column;
          return col?.name?.toLowerCase() === 'waiting' && !t.isArchived;
        });
      case 'blocked':
        return tasks.filter((t) => {
          const col = (t as any).column;
          return col?.name?.toLowerCase() === 'blocked' && !t.isArchived;
        });
      case 'completed':
        return tasks.filter((t) => t.isArchived);
      default:
        return tasks.filter((t) => !t.isArchived);
    }
  };

  const filteredTasks = filterTasks();

  const renderTask = ({ item }: { item: Task }) => {
    const pColor = priorityColors[item.priority] || priorityColors.low;
    return (
      <TouchableOpacity
        style={[styles.taskCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.priorityDot, { backgroundColor: pColor.text }]} />
          <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View style={styles.taskMeta}>
          {item.dueDate && (
            <View style={[styles.metaBadge, { backgroundColor: isOverdue(item.dueDate) ? colors.dangerLight : colors.bgSurfaceElevated }]}>
              <Ionicons name="time-outline" size={12} color={isOverdue(item.dueDate) ? colors.danger : colors.textMuted} />
              <Text style={[styles.metaText, { color: isOverdue(item.dueDate) ? colors.danger : colors.textMuted }]}>
                {formatDate(item.dueDate)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabs = () => (
    <View style={[styles.tabsWrapper, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
      <FlatList
        horizontal
        data={tabs}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={15}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        ListHeaderComponent={renderTabs}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsWrapper: { borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13, fontWeight: '500' },
  listContent: { flexGrow: 1 },
  taskCard: { marginHorizontal: 10, marginTop: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  taskTitle: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },
  taskMeta: { flexDirection: 'row', gap: 8 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4 },
  metaText: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
