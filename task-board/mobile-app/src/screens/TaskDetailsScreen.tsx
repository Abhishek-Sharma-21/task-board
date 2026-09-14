import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Task, Column } from '../types';
import { api } from '../services/api';

interface TaskDetailsScreenProps {
  task: Task | null;
  columns?: Column[];
  onOpenChat: () => void;
  onViewActivity: () => void;
  onTaskUpdated?: (updatedTask: Task) => void;
  onBack: () => void;
}

export const TaskDetailsScreen: React.FC<TaskDetailsScreenProps> = ({
  task,
  columns,
  onOpenChat,
  onViewActivity,
  onTaskUpdated,
  onBack,
}) => {
  const { colors } = useTheme();
  const [currentTask, setCurrentTask] = useState<Task | null>(task);
  const [checklist, setChecklist] = useState<Array<{ id: string; title: string; completed: boolean }>>(
    task?.checklist || []
  );
  const [newCheckTitle, setNewCheckTitle] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);

  useEffect(() => {
    setCurrentTask(task);
    if (task?.checklist) {
      setChecklist(task.checklist);
    }
  }, [task]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!currentTask) return;
    try {
      setIsUpdatingStatus(true);
      let targetColumnId: string | undefined;
      if (columns && columns.length > 0) {
        const matchingCol = columns.find(
          (c) =>
            c.name.toLowerCase().trim() === newStatus.toLowerCase().trim() ||
            c.name.toLowerCase().includes(newStatus.toLowerCase()) ||
            newStatus.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchingCol) {
          targetColumnId = matchingCol.id;
        }
      }

      let res;
      if (targetColumnId && targetColumnId !== currentTask.columnId) {
        res = await api.put(`/tasks/${currentTask.id}/move`, {
          toColumnId: targetColumnId,
          toPosition: 0,
          expectedVersion: (currentTask as any).version ?? 0,
        });
      } else {
        res = await api.put(`/tasks/${currentTask.id}`, {
          status: newStatus,
          expectedVersion: (currentTask as any).version ?? 0,
        });
      }

      if (res.data?.data) {
        const updated = res.data.data;
        const taskWithStatus = { ...updated, status: newStatus };
        setCurrentTask(taskWithStatus);
        if (onTaskUpdated) onTaskUpdated(taskWithStatus);
      }
    } catch (e: any) {
      console.log('[mobile-app] Error updating task status:', e?.response?.data || e);
    } finally {
      setIsUpdatingStatus(false);
      setShowActionsModal(false);
    }
  };

  const handleUpdatePriority = async (newPriority: 'Low' | 'Medium' | 'High') => {
    if (!currentTask) return;
    try {
      const res = await api.put(`/tasks/${currentTask.id}`, {
        priority: newPriority,
        expectedVersion: (currentTask as any).version ?? 0,
      });
      if (res.data?.data) {
        const updated = res.data.data;
        setCurrentTask(updated);
        if (onTaskUpdated) onTaskUpdated(updated);
      }
    } catch (e: any) {
      console.log('[mobile-app] Error updating priority:', e?.response?.data || e);
    } finally {
      setShowActionsModal(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newCheckTitle.trim() || !currentTask) return;
    const itemTitle = newCheckTitle.trim();
    setNewCheckTitle('');

    try {
      const res = await api.post(`/tasks/${currentTask.id}/checklists`, { title: itemTitle });
      if (res.data?.data) {
        setChecklist((prev) => [...prev, res.data.data]);
      } else {
        const tempItem = { id: `cl-${Date.now()}`, title: itemTitle, completed: false };
        setChecklist((prev) => [...prev, tempItem]);
      }
    } catch (e) {
      const tempItem = { id: `cl-${Date.now()}`, title: itemTitle, completed: false };
      setChecklist((prev) => [...prev, tempItem]);
    }
  };

  const toggleCheck = async (id: string) => {
    const target = checklist.find((c) => c.id === id);
    if (!target) return;
    const nextVal = !target.completed;

    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: nextVal } : item))
    );

    try {
      await api.patch(`/checklists/${id}`, { completed: nextVal });
    } catch (e) {
      console.log('[mobile-app] Error toggling checklist item');
    }
  };

  const completedCount = checklist.filter((c) => c.completed).length;
  const statusOptions = ['To Do', 'In Progress', 'Review', 'Done'];
  const currentStatus = currentTask?.status || 'In Progress';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
      <View style={styles.screenBack}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Task Details</Text>

        <TouchableOpacity onPress={() => setShowActionsModal(true)} activeOpacity={0.7} style={styles.dotsBtn}>
          <Text style={[styles.dotsText, { color: colors.textMuted }]}>•••</Text>
        </TouchableOpacity>
      </View>

      {/* Task Header & Interactive Status Picker */}
      <View style={[styles.taskHeader, { borderBottomColor: colors.border }]}>
        {/* Quick Mark Complete Button */}
        {(() => {
          const isDone =
            currentTask?.isCompleted ||
            currentStatus.toLowerCase().includes('done') ||
            currentStatus.toLowerCase().includes('complete');
          return (
            <TouchableOpacity
              style={[
                styles.markCompleteBtn,
                {
                  backgroundColor: isDone ? colors.green : colors.surface,
                  borderColor: isDone ? colors.green : colors.border,
                },
              ]}
              onPress={() => handleUpdateStatus(isDone ? 'To Do' : 'Done')}
              disabled={isUpdatingStatus}
              activeOpacity={0.8}
            >
              <Text style={[styles.markCompleteBtnText, { color: isDone ? '#ffffff' : colors.text }]}>
                {isDone ? '✓ Completed (Tap to reopen)' : '◯ Mark as Complete'}
              </Text>
            </TouchableOpacity>
          );
        })()}

        <Text style={[styles.statusLabelTitle, { color: colors.textMuted }]}>Status & Priority:</Text>
        <View style={styles.statusPickerRow}>
          {statusOptions.map((st) => {
            const isActive = currentStatus.toLowerCase() === st.toLowerCase();
            return (
              <TouchableOpacity
                key={st}
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isActive ? colors.red : colors.surface,
                    borderColor: isActive ? colors.red : colors.border,
                  },
                ]}
                onPress={() => handleUpdateStatus(st)}
                disabled={isUpdatingStatus}
              >
                <Text style={[styles.statusPillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
          {isUpdatingStatus && <ActivityIndicator size="small" color={colors.red} />}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{currentTask?.title || 'Untitled Task'}</Text>

        <Text style={[styles.description, { color: colors.textMuted }]}>
          {currentTask?.description || 'No description provided for this task.'}
        </Text>
      </View>

      {/* Dynamic Metadata Fields */}
      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Priority</Text>
        <Badge
          label={currentTask?.priority || 'Medium'}
          type={currentTask?.priority === 'High' ? 'red' : 'blue'}
        />
      </View>

      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Assignee</Text>
        <View style={styles.assigneesBox}>
          {currentTask?.assigneeId ? (
            <>
              <Avatar
                letter={currentTask?.assignee?.name || 'A'}
                size="small"
                isRed
              />
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {currentTask?.assignee?.name || 'Assigned Member'}
              </Text>
            </>
          ) : (
            <Text style={[styles.detailValue, { color: colors.textMuted }]}>
              Unassigned
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Due Date</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {currentTask?.dueDate ? new Date(currentTask.dueDate).toLocaleDateString() : 'No due date'}
        </Text>
      </View>

      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Labels</Text>
        <View style={styles.badgeRow}>
          {currentTask?.labels && currentTask.labels.length > 0 ? (
            currentTask.labels.map((lbl, i) => <Badge key={i} label={lbl} type="blue" />)
          ) : (
            <Text style={[styles.detailMuted, { color: colors.textMuted }]}>No labels</Text>
          )}
        </View>
      </View>

      {/* Dynamic Checklist Section */}
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Checklist / Subtasks</Text>
        <Text style={[styles.redCount, { color: colors.redLight }]}>
          {completedCount} / {checklist.length} complete
        </Text>
      </View>

      <View style={styles.checklist}>
        {checklist.length > 0 ? (
          checklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checkItem}
              onPress={() => toggleCheck(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkBox, { borderColor: colors.border }, item.completed && { backgroundColor: colors.red, borderColor: colors.red }]}>
                {item.completed && <Text style={styles.checkIcon}>✓</Text>}
              </View>
              <Text style={[styles.checkTitle, { color: colors.text }, item.completed && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.emptyChecklistText, { color: colors.textMuted }]}>No checklist items added yet.</Text>
        )}

        {/* Add Checklist Item Input */}
        <View style={styles.addChecklistRow}>
          <TextInput
            style={[styles.addCheckInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            placeholder="+ Add subtask / checklist item"
            placeholderTextColor={colors.textMuted}
            value={newCheckTitle}
            onChangeText={setNewCheckTitle}
            onSubmitEditing={handleAddChecklistItem}
          />
          {newCheckTitle.trim().length > 0 && (
            <TouchableOpacity style={[styles.addCheckBtn, { backgroundColor: colors.red }]} onPress={handleAddChecklistItem}>
              <Text style={styles.addCheckBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.secBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={onOpenChat} activeOpacity={0.8}>
          <Text style={[styles.secBtnText, { color: colors.text }]}>💬 Open Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={onViewActivity} activeOpacity={0.8}>
          <Text style={[styles.secBtnText, { color: colors.text }]}>📜 View Activity</Text>
        </TouchableOpacity>
      </View>

      {/* Three-Dot Action Modal */}
      <Modal visible={showActionsModal} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowActionsModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Task Actions</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Change task properties or status</Text>

            <Text style={[styles.modalSectionLabel, { color: colors.text }]}>Change Status:</Text>
            <View style={styles.modalBtnGrid}>
              {statusOptions.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.actionChoiceBtn,
                    {
                      backgroundColor: currentStatus === st ? colors.red : colors.surface2,
                      borderColor: currentStatus === st ? colors.red : colors.border,
                    },
                  ]}
                  onPress={() => handleUpdateStatus(st)}
                >
                  <Text style={[styles.actionChoiceText, { color: currentStatus === st ? '#ffffff' : colors.text }]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.text }]}>Change Priority:</Text>
            <View style={styles.modalBtnGrid}>
              {(['Low', 'Medium', 'High'] as const).map((pr) => (
                <TouchableOpacity
                  key={pr}
                  style={[styles.actionChoiceBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                  onPress={() => handleUpdatePriority(pr)}
                >
                  <Text style={[styles.actionChoiceText, { color: colors.text }]}>{pr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.surface2 }]} onPress={() => setShowActionsModal(false)}>
              <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  screenBack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 27,
    lineHeight: 27,
    marginRight: 9,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dotsBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dotsText: {
    fontSize: 16,
    fontWeight: '800',
  },
  taskHeader: {
    borderBottomWidth: 1,
    paddingBottom: 16,
    marginBottom: 8,
  },
  statusLabelTitle: {
    fontSize: 10,
    marginBottom: 6,
    fontWeight: '700',
  },
  statusPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginVertical: 10,
  },
  description: {
    fontSize: 11,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 13,
  },
  detailLabel: {
    fontSize: 11,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailMuted: {
    fontSize: 10,
  },
  assigneesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  redCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  checklist: {
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 4,
  },
  checkBox: {
    width: 17,
    height: 17,
    borderWidth: 1,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  checkTitle: {
    fontSize: 11,
  },
  emptyChecklistText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  addChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  addCheckInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
  },
  addCheckBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addCheckBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  markCompleteBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  markCompleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 11,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  modalBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },
  actionChoiceBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionChoiceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalCloseBtn: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modalCloseText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
