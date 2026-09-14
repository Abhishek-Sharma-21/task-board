import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Column, WorkspaceMember } from '../types';
import { Avatar } from '../components/Avatar';
import { api } from '../services/api';

interface CreateTaskScreenProps {
  workspaceId?: string | null;
  boardId?: string | null;
  columns?: Column[];
  members?: WorkspaceMember[];
  onTaskCreated: () => void;
  onBack: () => void;
}

export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({
  workspaceId,
  boardId,
  columns = [],
  members: propMembers = [],
  onTaskCreated,
  onBack,
}) => {
  const { colors } = useTheme();

  const defaultCols = columns.length > 0 ? columns : [
    { id: 'col-todo', name: 'To Do', boardId: boardId || 'b-1', order: 0 },
    { id: 'col-prog', name: 'In Progress', boardId: boardId || 'b-1', order: 1 },
    { id: 'col-rev', name: 'Review', boardId: boardId || 'b-1', order: 2 },
    { id: 'col-done', name: 'Done', boardId: boardId || 'b-1', order: 3 },
  ];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColId, setSelectedColId] = useState(defaultCols[0]?.id || '');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dropdown Modal & Fetched Members State
  const [fetchedMembers, setFetchedMembers] = useState<WorkspaceMember[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  useEffect(() => {
    if (propMembers.length > 0) return;
    if (!workspaceId) return;

    let isMounted = true;
    setFetchingMembers(true);
    api.get(`/workspaces/${workspaceId}/members`)
      .then((res) => {
        if (isMounted && res.data?.data) {
          setFetchedMembers(res.data.data);
        }
      })
      .catch((err) => {
        console.log('[mobile-app] Error fetching members for CreateTaskScreen:', err);
      })
      .finally(() => {
        if (isMounted) setFetchingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, propMembers.length]);

  const activeMemberList = propMembers.length > 0 ? propMembers : fetchedMembers;

  const selectedMemberObj = activeMemberList.find(
    (m) => (m.userId || m.user?.id || m.id) === selectedAssigneeId
  );
  const selectedAssigneeName = selectedMemberObj?.user?.name || (selectedMemberObj as any)?.name;

  const filteredMembers = activeMemberList.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const name = m.user?.name || (m as any).name || '';
    const email = m.user?.email || (m as any).email || '';
    const query = memberSearchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Task title is required');
      return;
    }
    if (!boardId) {
      setErrorMsg('No active board selected for this task');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const parsedLabels = labels ? labels.split(',').map((s) => s.trim()).filter(Boolean) : [];
      let formattedDueDate: string | undefined = undefined;
      if (dueDate.trim()) {
        const d = new Date(dueDate.trim());
        if (!isNaN(d.getTime())) {
          formattedDueDate = d.toISOString();
        }
      }

      const res = await api.post(`/boards/${boardId}/tasks`, {
        title: title.trim(),
        description: description.trim() || undefined,
        columnId: selectedColId || defaultCols[0]?.id,
        priority,
        assigneeId: selectedAssigneeId || undefined,
        dueDate: formattedDueDate,
        labels: parsedLabels.length > 0 ? parsedLabels : undefined,
      });

      if (res.data?.data) {
        onTaskCreated();
      }
    } catch (err: any) {
      console.log('[mobile-app] Task creation error:', err);
      const msg = err.response?.data?.message || 'Failed to create task. Please verify board selection.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDueDate(dateStr);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.screenBack}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create New Task</Text>
      </View>

      {errorMsg && (
        <View style={[styles.errorBox, { backgroundColor: colors.redBg, borderColor: colors.red }]}>
          <Text style={[styles.errorText, { color: colors.redLight }]}>⚠️ {errorMsg}</Text>
        </View>
      )}

      {/* Task Title */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Task Title *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="e.g. Implement user authentication endpoint"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={(txt) => {
            setTitle(txt);
            if (errorMsg) setErrorMsg(null);
          }}
          editable={!isSubmitting}
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Add detailed task requirements and acceptance criteria..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          editable={!isSubmitting}
        />
      </View>

      {/* Column Selector */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Column / Status</Text>
        <View style={styles.pillRow}>
          {defaultCols.map((col) => {
            const isActive = selectedColId === col.id;
            return (
              <TouchableOpacity
                key={col.id}
                style={[
                  styles.selectorPill,
                  {
                    backgroundColor: isActive ? colors.red : colors.surface,
                    borderColor: isActive ? colors.red : colors.border,
                  },
                ]}
                onPress={() => setSelectedColId(col.id)}
              >
                <Text style={[styles.selectorPillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                  {col.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Priority Selector */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Priority</Text>
        <View style={styles.pillRow}>
          {(['Low', 'Medium', 'High'] as const).map((pr) => {
            const isActive = priority === pr;
            return (
              <TouchableOpacity
                key={pr}
                style={[
                  styles.selectorPill,
                  {
                    backgroundColor: isActive ? colors.red : colors.surface,
                    borderColor: isActive ? colors.red : colors.border,
                  },
                ]}
                onPress={() => setPriority(pr)}
              >
                <Text style={[styles.selectorPillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                  {pr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Assignee Dropdown Picker */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Assignee</Text>

        <TouchableOpacity
          style={[styles.dropdownBox, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.8}
          onPress={() => setShowAssigneeModal(true)}
        >
          <View style={styles.dropdownLeft}>
            {selectedAssigneeName ? (
              <Avatar letter={selectedAssigneeName} size="small" isRed />
            ) : (
              <View style={[styles.unassignedIcon, { backgroundColor: colors.border }]}>
                <Text style={[styles.unassignedIconText, { color: colors.textMuted }]}>👤</Text>
              </View>
            )}
            <Text style={[styles.dropdownValueText, { color: selectedAssigneeName ? colors.text : colors.textMuted }]}>
              {selectedAssigneeName ? selectedAssigneeName : 'Unassigned (Tap to select team member)'}
            </Text>
          </View>
          {fetchingMembers ? (
            <ActivityIndicator size="small" color={colors.red} />
          ) : (
            <Text style={[styles.dropdownChevron, { color: colors.textMuted }]}>▼</Text>
          )}
        </TouchableOpacity>

        {/* Quick Assignee Pills for instant 1-tap selection */}
        {activeMemberList.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPillRow}>
            <TouchableOpacity
              style={[
                styles.selectorPill,
                {
                  backgroundColor: selectedAssigneeId === null ? colors.red : colors.surface,
                  borderColor: selectedAssigneeId === null ? colors.red : colors.border,
                },
              ]}
              onPress={() => setSelectedAssigneeId(null)}
            >
              <Text style={[styles.selectorPillText, { color: selectedAssigneeId === null ? '#ffffff' : colors.textMuted, fontWeight: selectedAssigneeId === null ? '700' : '600' }]}>
                Unassigned
              </Text>
            </TouchableOpacity>

            {activeMemberList.map((m) => {
              const u = m.user;
              const userId = m.userId || u?.id || m.id;
              if (!userId) return null;
              const isActive = selectedAssigneeId === userId;
              const mName = u?.name || (m as any).name || 'Member';

              return (
                <TouchableOpacity
                  key={userId}
                  style={[
                    styles.selectorPill,
                    {
                      backgroundColor: isActive ? colors.red : colors.surface,
                      borderColor: isActive ? colors.red : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedAssigneeId(userId)}
                >
                  <Text style={[styles.selectorPillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                    {mName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Due Date Selector */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Due Date (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          value={dueDate}
          onChangeText={setDueDate}
        />
        <View style={styles.quickDateRow}>
          <TouchableOpacity style={[styles.quickDateBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => handleQuickDate(0)}>
            <Text style={[styles.quickDateText, { color: colors.redLight }]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickDateBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => handleQuickDate(1)}>
            <Text style={[styles.quickDateText, { color: colors.redLight }]}>Tomorrow</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickDateBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => handleQuickDate(7)}>
            <Text style={[styles.quickDateText, { color: colors.redLight }]}>+1 Week</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Labels */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Labels (Comma Separated)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="e.g. Frontend, Bug, Critical"
          placeholderTextColor={colors.textMuted}
          value={labels}
          onChangeText={setLabels}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.red }, (!title.trim() || isSubmitting) && styles.disabledBtn]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={!title.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.primaryBtnText}>Create Task</Text>
        )}
      </TouchableOpacity>

      {/* Assignee Dropdown Picker Modal */}
      <Modal visible={showAssigneeModal} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowAssigneeModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Assignee</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>Choose a team member to assign to this task.</Text>

            <TextInput
              style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.text }]}
              placeholder="Search member by name or email..."
              placeholderTextColor={colors.textMuted}
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
            />

            <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false}>
              {/* Unassigned Option */}
              <TouchableOpacity
                style={[
                  styles.memberOptionRow,
                  { borderBottomColor: colors.border },
                  selectedAssigneeId === null && { backgroundColor: colors.redBg },
                ]}
                onPress={() => {
                  setSelectedAssigneeId(null);
                  setShowAssigneeModal(false);
                }}
              >
                <View style={[styles.unassignedIcon, { backgroundColor: colors.border }]}>
                  <Text style={[styles.unassignedIconText, { color: colors.textMuted }]}>👤</Text>
                </View>
                <View style={styles.memberOptionInfo}>
                  <Text style={[styles.memberOptionName, { color: colors.text }]}>Unassigned</Text>
                  <Text style={[styles.memberOptionEmail, { color: colors.textMuted }]}>No person assigned</Text>
                </View>
                {selectedAssigneeId === null && (
                  <Text style={[styles.checkMark, { color: colors.redLight }]}>✓</Text>
                )}
              </TouchableOpacity>

              {filteredMembers.map((m) => {
                const u = m.user;
                const userId = m.userId || u?.id || m.id;
                if (!userId) return null;
                const mName = u?.name || (m as any).name || 'Workspace Member';
                const mEmail = u?.email || (m as any).email || 'member@example.com';
                const isSelected = selectedAssigneeId === userId;
                const isHead = m.role === 'admin' || m.role === 'owner';

                return (
                  <TouchableOpacity
                    key={userId}
                    style={[
                      styles.memberOptionRow,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.redBg },
                    ]}
                    onPress={() => {
                      setSelectedAssigneeId(userId);
                      setShowAssigneeModal(false);
                    }}
                  >
                    <Avatar letter={mName} isRed={isHead} size="small" />
                    <View style={styles.memberOptionInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberOptionName, { color: colors.text }]}>{mName}</Text>
                        {isHead && <Text style={[styles.headBadge, { color: colors.redLight }]}> (Team Head)</Text>}
                      </View>
                      <Text style={[styles.memberOptionEmail, { color: colors.textMuted }]}>{mEmail}</Text>
                    </View>
                    {isSelected && <Text style={[styles.checkMark, { color: colors.redLight }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              {filteredMembers.length === 0 && (
                <View style={styles.noMembersBox}>
                  <Text style={[styles.noMembersText, { color: colors.textMuted }]}>
                    No matching workspace members found.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: colors.border }]}
              onPress={() => setShowAssigneeModal(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>Cancel</Text>
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
    gap: 9,
    marginBottom: 21,
  },
  backText: {
    fontSize: 27,
    lineHeight: 27,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  errorBox: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
  },
  textArea: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  quickPillRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
  },
  selectorPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectorPillText: {
    fontSize: 11,
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownValueText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 10,
    marginLeft: 6,
  },
  unassignedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unassignedIconText: {
    fontSize: 12,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickDateBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickDateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 11,
    padding: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 11,
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 12,
  },
  memberList: {
    maxHeight: 260,
  },
  memberOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 8,
    gap: 10,
  },
  memberOptionInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberOptionName: {
    fontSize: 12,
    fontWeight: '700',
  },
  headBadge: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberOptionEmail: {
    fontSize: 10,
    marginTop: 2,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
  },
  noMembersBox: {
    padding: 20,
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 11,
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
