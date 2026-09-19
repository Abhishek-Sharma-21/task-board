import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';
import { useBoardStore } from '../../stores/boardStore';
import { Task, BoardColumn } from '../../types';
import { priorityColors, formatDate, isOverdue } from '../../utils/dates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.82;
const COLUMN_GAP = 12;

export default function BoardScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { projects, fetchProjects } = useProjectStore();
  const {
    boards,
    activeBoard,
    columns,
    tasksByColumn,
    fetchBoards,
    setActiveBoard,
    fetchColumns,
    fetchTasks,
    moveTask,
  } = useBoardStore();
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (activeWorkspace) fetchProjects(activeWorkspace.id);
  }, [activeWorkspace]);

  useEffect(() => {
    if (projects.length > 0 && !activeBoard) {
      fetchBoards(projects[0].id).then(() => {
        const currentBoards = useBoardStore.getState().boards;
        if (currentBoards.length > 0) {
          setActiveBoard(currentBoards[0]);
        }
      });
    }
  }, [projects]);

  useEffect(() => {
    if (activeBoard) {
      fetchColumns(activeBoard.id).then(() => {
        fetchTasks(activeBoard.id);
      });
    }
  }, [activeBoard]);

  const onRefresh = async () => {
    if (!activeBoard) return;
    setRefreshing(true);
    await fetchTasks(activeBoard.id);
    setRefreshing(false);
  };

  const onColumnScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (COLUMN_WIDTH + COLUMN_GAP));
    setActiveColumnIndex(index);
  };

  const handleLongPress = (task: Task) => {
    const otherColumns = columns.filter((col) => col.id !== task.columnId);

    if (otherColumns.length === 0) {
      Alert.alert('Move Task', 'This is the only column on the board.');
      return;
    }

    Alert.alert('Move Task', `"${task.title}"`, [
      ...otherColumns.map((col) => ({
        text: `Move to ${col.name}`,
        onPress: () => {
          const targetTasks = tasksByColumn[col.id] || [];
          moveTask(task.id, col.id, targetTasks.length, task.version || 1);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const renderTaskCard = (task: Task) => {
    const pColor = priorityColors[task.priority] || priorityColors.low;
    return (
      <TouchableOpacity
        key={task.id}
        style={[styles.taskCard, { backgroundColor: colors.bgKanbanCard, borderColor: colors.borderSubtle }]}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        onLongPress={() => handleLongPress(task)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: pColor.bg }]}>
            <Text style={[styles.priorityText, { color: pColor.text }]}>{task.priority.toUpperCase()}</Text>
          </View>
          {task.isArchived && (
            <Ionicons name="archive-outline" size={14} color={colors.textMuted} />
          )}
        </View>
        <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={3}>
          {task.title}
        </Text>
        <View style={styles.taskFooter}>
          {task.dueDate && (
            <View style={[styles.dueBadge, { backgroundColor: isOverdue(task.dueDate) ? colors.dangerLight : colors.bgSurfaceElevated }]}>
              <Ionicons name="time-outline" size={11} color={isOverdue(task.dueDate) ? colors.danger : colors.textMuted} />
              <Text style={[styles.dueText, { color: isOverdue(task.dueDate) ? colors.danger : colors.textMuted }]}>
                {formatDate(task.dueDate)}
              </Text>
            </View>
          )}
          {task.assignees && task.assignees.length > 0 && (
            <View style={styles.assignees}>
              {task.assignees.slice(0, 3).map((a, i) => (
                <View key={a.id} style={[styles.miniAvatar, { backgroundColor: colors.primary + '30', marginLeft: i > 0 ? -6 : 0 }]}>
                  <Text style={[styles.miniAvatarText, { color: colors.primary }]}>
                    {a.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderColumn = (column: BoardColumn) => {
    const tasks = tasksByColumn[column.id] || [];
    return (
      <View key={column.id} style={[styles.column, { width: COLUMN_WIDTH }]}>
        <View style={[styles.columnHeader, { backgroundColor: colors.bgKanbanColumn }]}>
          <Text style={[styles.columnName, { color: colors.textPrimary }]}>{column.name}</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.bgSurfaceElevated }]}>
            <Text style={[styles.countText, { color: colors.textMuted }]}>{tasks.length}</Text>
          </View>
        </View>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderTaskCard(item)}
          contentContainerStyle={styles.taskList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyColumn}>
              <Text style={[styles.emptyColumnText, { color: colors.textMuted }]}>No tasks</Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgKanban }]} edges={['top']}>
      {/* Board Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <Text style={[styles.boardName, { color: colors.textPrimary }]} numberOfLines={1}>
          {activeBoard?.name || 'Board'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.bgSurfaceElevated }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Column Indicators */}
      {columns.length > 1 && (
        <View style={styles.indicators}>
          {columns.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor: index === activeColumnIndex ? colors.primary : colors.borderDefault,
                  width: index === activeColumnIndex ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Swipeable Columns */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onColumnScroll}
        snapToInterval={COLUMN_WIDTH + COLUMN_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.columnsContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {columns.map((column) => renderColumn(column))}
      </ScrollView>

      {/* FAB */}
      {activeBoard && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('TaskDetail', { mode: 'create', boardId: activeBoard.id, columnId: columns[activeColumnIndex]?.id })}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  boardName: { fontSize: 18, fontWeight: '700', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  indicators: { flexDirection: 'row', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  indicator: { height: 6, borderRadius: 3 },
  columnsContainer: { paddingHorizontal: 16, paddingBottom: 80 },
  column: { marginRight: COLUMN_GAP },
  columnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginBottom: 8 },
  columnName: { fontSize: 14, fontWeight: '600' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '500' },
  taskList: { gap: 8 },
  taskCard: { padding: 14, borderRadius: 10, borderWidth: 1 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  taskTitle: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 10 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, gap: 4 },
  dueText: { fontSize: 11 },
  assignees: { flexDirection: 'row' },
  miniAvatar: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  miniAvatarText: { fontSize: 9, fontWeight: '600' },
  emptyColumn: { alignItems: 'center', paddingTop: 40 },
  emptyColumnText: { fontSize: 13 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
});
