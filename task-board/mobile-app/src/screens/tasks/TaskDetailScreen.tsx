import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useBoardStore } from '../../stores/boardStore';
import { useCommentStore } from '../../stores/commentStore';
import { useChatStore } from '../../stores/chatStore';
import { Task, ChecklistItem } from '../../types';
import { formatDate, priorityColors } from '../../utils/dates';
import api from '../../api/client';

type Tab = 'details' | 'comments' | 'chat' | 'checklist';

export default function TaskDetailScreen({ route, navigation }: any) {
  const { taskId, mode, boardId, columnId } = route.params || {};
  const isCreate = mode === 'create';
  const { colors } = useThemeStore();
  const { createTask, updateTask, archiveTask, deleteTask } = useBoardStore();
  const { commentsByTask, fetchComments, addComment } = useCommentStore();
  const { messagesByTask, typingUsersByTask, fetchMessages, sendMessage } = useChatStore();

  const [task, setTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [commentText, setCommentText] = useState('');
  const [chatText, setChatText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isEditing, setIsEditing] = useState(isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingTask, setLoadingTask] = useState(!isCreate && !!taskId);

  useEffect(() => {
    if (taskId) loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoadingTask(true);
      const { data } = await api.get(`/tasks/${taskId}`);
      setTask(data.data);
      setTitle(data.data.title);
      setDescription(data.data.description || '');
      setPriority(data.data.priority);
      setChecklist(data.data.checklist || []);
    } catch {} finally {
      setLoadingTask(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchComments(taskId);
      fetchMessages(taskId);
    }
  }, [taskId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
    try {
      setIsSaving(true);
      if (isCreate && boardId && columnId) {
        await createTask(boardId, columnId, title.trim(), { description, priority: capitalizedPriority as any });
      } else if (taskId) {
        await updateTask(taskId, { title: title.trim(), description, priority: capitalizedPriority as any });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !taskId) return;
    try {
      setSendingComment(true);
      await addComment(taskId, commentText.trim());
      setCommentText('');
    } finally {
      setSendingComment(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatText.trim() || !taskId) return;
    try {
      setSendingChat(true);
      await sendMessage(taskId, chatText.trim());
      setChatText('');
    } finally {
      setSendingChat(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !taskId) return;
    try {
      const { data } = await api.post(`/tasks/${taskId}/checklists`, { title: newChecklistItem.trim() });
      setChecklist([...checklist, data.data]);
      setNewChecklistItem('');
    } catch {}
  };

  const handleToggleChecklist = async (item: ChecklistItem) => {
    try {
      await api.patch(`/checklists/${item.id}`, { completed: !item.completed });
      setChecklist(checklist.map((c) => (c.id === item.id ? { ...c, completed: !c.completed } : c)));
    } catch {}
  };

  const handleDeleteChecklistItem = async (item: ChecklistItem) => {
    try {
      await api.delete(`/checklists/${item.id}`);
      setChecklist(checklist.filter((c) => c.id !== item.id));
    } catch {}
  };

  const comments = commentsByTask[taskId] || [];
  const messages = messagesByTask[taskId] || [];
  const typingUsers = typingUsersByTask[taskId] || [];
  const completedCount = checklist.filter((c) => c.completed).length;
  const isBusy = isSaving || sendingComment || sendingChat;

  const viewTabs: { key: Tab; label: string; icon: string; count?: string }[] = [
    { key: 'details', label: 'Details', icon: 'information-circle-outline' },
    { key: 'checklist', label: 'Checklist', icon: 'checkbox-outline', count: checklist.length > 0 ? `${completedCount}/${checklist.length}` : undefined },
    { key: 'comments', label: 'Comments', icon: 'chatbubble-outline', count: comments.length > 0 ? String(comments.length) : undefined },
    { key: 'chat', label: 'Chat', icon: 'chatbubbles-outline' },
  ];

  const priorities = ['urgent', 'high', 'medium', 'low'];

  const renderCreateForm = () => (
    <View style={styles.form}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Title *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
        placeholderTextColor={colors.textMuted}
        autoFocus
        editable={!isBusy}
      />

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Add a description..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        editable={!isBusy}
      />

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Priority</Text>
      <View style={styles.priorityRow}>
        {priorities.map((p) => {
          const pColor = priorityColors[p as keyof typeof priorityColors];
          const isSelected = priority === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.priorityOption, { backgroundColor: isSelected ? pColor.bg : colors.bgInput, borderColor: isSelected ? pColor.border : colors.borderInput }]}
              onPress={() => setPriority(p)}
              disabled={isBusy}
            >
              <View style={[styles.priorityDotSmall, { backgroundColor: pColor.text }]} />
              <Text style={[styles.priorityOptionText, { color: isSelected ? pColor.text : colors.textSecondary }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderDetailsTab = () => (
    <View style={styles.form}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Title</Text>
      {isEditing ? (
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          placeholderTextColor={colors.textMuted}
          editable={!isBusy}
        />
      ) : (
        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{title}</Text>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
      {isEditing ? (
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add a description..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          editable={!isBusy}
        />
      ) : (
        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{description || 'No description'}</Text>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Priority</Text>
      {isEditing ? (
        <View style={styles.priorityRow}>
          {priorities.map((p) => {
            const pColor = priorityColors[p as keyof typeof priorityColors];
            const isSelected = priority === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.priorityOption, { backgroundColor: isSelected ? pColor.bg : colors.bgInput, borderColor: isSelected ? pColor.border : colors.borderInput }]}
                onPress={() => setPriority(p)}
                disabled={isBusy}
              >
                <View style={[styles.priorityDotSmall, { backgroundColor: pColor.text }]} />
                <Text style={[styles.priorityOptionText, { color: isSelected ? pColor.text : colors.textSecondary }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={[styles.priorityBadge, { backgroundColor: priorityColors[priority as keyof typeof priorityColors]?.bg }]}>
          <Text style={[styles.priorityBadgeText, { color: priorityColors[priority as keyof typeof priorityColors]?.text }]}>
            {priority.toUpperCase()}
          </Text>
        </View>
      )}

      {task && (
        <View style={[styles.metaCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Created</Text>
            <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{formatDate(task.createdAt)}</Text>
          </View>
          {task.dueDate && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Due Date</Text>
              <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{formatDate(task.dueDate)}</Text>
            </View>
          )}
        </View>
      )}

      {!isEditing && taskId && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.warningLight }]}
            onPress={() => { archiveTask(taskId); navigation.goBack(); }}
            disabled={isBusy}
          >
            <Ionicons name="archive-outline" size={18} color={colors.warning} />
            <Text style={[styles.actionText, { color: colors.warning }]}>Archive</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.dangerLight }]}
            onPress={() => {
              Alert.alert('Delete', 'Delete this task?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => { deleteTask(taskId); navigation.goBack(); } },
              ]);
            }}
            disabled={isBusy}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderChecklistTab = () => (
    <View style={styles.form}>
      {checklist.map((item) => (
        <View key={item.id} style={[styles.checklistItem, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={() => handleToggleChecklist(item)}>
            <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={22} color={item.completed ? colors.success : colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.checklistText, { color: item.completed ? colors.textMuted : colors.textPrimary, textDecorationLine: item.completed ? 'line-through' : 'none' }]}>
            {item.title}
          </Text>
          <TouchableOpacity onPress={() => handleDeleteChecklistItem(item)}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
          value={newChecklistItem}
          onChangeText={setNewChecklistItem}
          placeholder="Add checklist item..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAddChecklistItem}
          editable={!isBusy}
        />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAddChecklistItem} disabled={isBusy}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCommentsTab = () => (
    <View>
      {comments.map((comment) => (
        <View key={comment.id} style={[styles.commentItem, { borderBottomColor: colors.borderSubtle }]}>
          <View style={[styles.commentAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.commentAvatarText, { color: colors.primary }]}>
              {comment.user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentAuthor, { color: colors.textPrimary }]}>{comment.user.name}</Text>
              <Text style={[styles.commentTime, { color: colors.textMuted }]}>{formatDate(comment.createdAt)}</Text>
            </View>
            <Text style={[styles.commentBody, { color: colors.textSecondary }]}>{comment.body}</Text>
          </View>
        </View>
      ))}
      <View style={[styles.commentInput, { borderTopColor: colors.borderSubtle }]}>
        <TextInput
          style={[styles.commentField, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!sendingComment}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: sendingComment ? 0.6 : 1 }]}
          onPress={handleAddComment}
          disabled={sendingComment || !commentText.trim()}
        >
          {sendingComment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderChatTab = () => (
    <View>
      {messages.map((msg) => (
        <View key={msg.id} style={styles.chatMessage}>
          <View style={[styles.chatAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.chatAvatarText, { color: colors.primary }]}>
              {msg.user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={[styles.chatAuthor, { color: colors.textPrimary }]}>{msg.user.name}</Text>
              <Text style={[styles.chatTime, { color: colors.textMuted }]}>{formatDate(msg.createdAt)}</Text>
            </View>
            <Text style={[styles.chatBody, { color: msg.isDeleted ? colors.textMuted : colors.textSecondary }]}>
              {msg.isDeleted ? 'Message deleted' : msg.body}
            </Text>
          </View>
        </View>
      ))}
      {typingUsers.length > 0 && (
        <View style={styles.typingIndicator}>
          <Text style={[styles.typingText, { color: colors.textMuted }]}>
            {typingUsers.length === 1
              ? `${typingUsers[0].name} is typing...`
              : typingUsers.length === 2
              ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
              : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`}
          </Text>
        </View>
      )}
      <View style={[styles.chatInput, { borderTopColor: colors.borderSubtle }]}>
        <TextInput
          style={[styles.chatField, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
          value={chatText}
          onChangeText={setChatText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleSendChat}
          editable={!sendingChat}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: sendingChat ? 0.6 : 1 }]}
          onPress={handleSendChat}
          disabled={sendingChat || !chatText.trim()}
        >
          {sendingChat ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loadingTask) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Task Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading task...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {isCreate ? 'New Task' : 'Task Details'}
        </Text>
        {(isEditing || isCreate) && (
          <TouchableOpacity onPress={handleSave} disabled={isSaving || sendingComment || sendingChat}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />
            ) : (
              <Text style={[styles.saveBtn, { color: colors.primary, opacity: isBusy ? 0.5 : 1 }]}>Save</Text>
            )}
          </TouchableOpacity>
        )}
        {!isCreate && !isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)} disabled={isBusy}>
            <Ionicons name="create-outline" size={22} color={colors.primary} style={{ opacity: isBusy ? 0.5 : 1 }} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {isCreate ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {renderCreateForm()}
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            {/* Tabs */}
            <View style={[styles.tabsWrapper, { borderBottomColor: colors.borderSubtle }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {viewTabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab(tab.key)}
                    disabled={isBusy}
                  >
                    <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.key ? colors.primary : colors.textMuted} />
                    <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textMuted }]}>{tab.label}</Text>
                    {tab.count && (
                      <View style={[styles.tabBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.tabBadgeText, { color: colors.primary }]}>{tab.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Content */}
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {activeTab === 'details' && renderDetailsTab()}
              {activeTab === 'checklist' && renderChecklistTab()}
              {activeTab === 'comments' && renderCommentsTab()}
              {activeTab === 'chat' && renderChatTab()}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 2 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 15, fontWeight: '600' },
  tabsWrapper: { borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13, fontWeight: '500' },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  tabBadgeText: { fontSize: 10, fontWeight: '600' },
  content: { padding: 14 },
  form: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldValue: { fontSize: 14, lineHeight: 20 },
  priorityRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  priorityOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, borderWidth: 1, gap: 6 },
  priorityDotSmall: { width: 8, height: 8, borderRadius: 4 },
  priorityOptionText: { fontSize: 12, fontWeight: '500' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  metaCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  metaLabel: { fontSize: 12 },
  metaValue: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  actionText: { fontSize: 13, fontWeight: '500' },
  checklistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  checklistText: { flex: 1, fontSize: 14 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13 },
  addBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  commentItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 12, fontWeight: '600' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  commentAuthor: { fontSize: 12, fontWeight: '600' },
  commentTime: { fontSize: 10 },
  commentBody: { fontSize: 13, lineHeight: 18 },
  commentInput: { flexDirection: 'row', paddingTop: 10, borderTopWidth: 1, gap: 8, marginTop: 6 },
  commentField: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, maxHeight: 80 },
  sendBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  chatMessage: { flexDirection: 'row', paddingVertical: 6, gap: 10 },
  chatAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  chatAvatarText: { fontSize: 11, fontWeight: '600' },
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  chatAuthor: { fontSize: 11, fontWeight: '600' },
  chatTime: { fontSize: 9 },
  chatBody: { fontSize: 13, lineHeight: 18 },
  chatInput: { flexDirection: 'row', paddingTop: 10, borderTopWidth: 1, gap: 8, marginTop: 6 },
  chatField: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13 },
  typingIndicator: { paddingVertical: 4, paddingHorizontal: 4 },
  typingText: { fontSize: 11, fontStyle: 'italic' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
});
