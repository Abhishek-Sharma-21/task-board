import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { Avatar } from '../components/Avatar';
import { Project, Board, Task, Column, WorkspaceMember } from '../types';
import { api } from '../services/api';

interface BoardScreenProps {
  project: Project | null;
  workspaceMembers?: WorkspaceMember[];
  boards?: Board[];
  activeBoardId?: string | null;
  columns?: Column[];
  tasks?: Task[];
  onSelectBoard?: (boardId: string) => void;
  onSelectTask: (t: Task) => void;
  onCreateTask: () => void;
  onBack: () => void;
}

export const BoardScreen: React.FC<BoardScreenProps> = ({
  project,
  workspaceMembers = [],
  boards = [],
  activeBoardId,
  columns = [],
  tasks = [],
  onSelectBoard,
  onSelectTask,
  onCreateTask,
  onBack,
}) => {
  const { colors } = useTheme();

  const defaultCols: Column[] = columns.length > 0
    ? columns
    : [
        { id: 'col-1', name: 'To Do', boardId: activeBoardId || 'b-1', order: 0, createdAt: '' },
        { id: 'col-2', name: 'In Progress', boardId: activeBoardId || 'b-1', order: 1, createdAt: '' },
        { id: 'col-3', name: 'Review', boardId: activeBoardId || 'b-1', order: 2, createdAt: '' },
        { id: 'col-4', name: 'Done', boardId: activeBoardId || 'b-1', order: 3, createdAt: '' },
      ];

  const [activeColumnId, setActiveColumnId] = useState<string>(defaultCols[0]?.id || 'col-1');
  const [query, setQuery] = useState('');

  // Create Board Modal State
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [createBoardError, setCreateBoardError] = useState('');

  // Project Options & Team Modal State
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'team' | 'info'>('team');
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [modalMsg, setModalMsg] = useState<string | null>(null);

  const fetchProjectMembers = async () => {
    if (!project?.id) return;
    try {
      setLoadingMembers(true);
      const res = await api.get(`/projects/${project.id}/members`);
      if (res.data?.data) {
        setProjectMembers(res.data.data);
      }
    } catch (err) {
      console.log('[mobile-app] Error fetching project members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (showOptionsModal && project?.id) {
      fetchProjectMembers();
    }
  }, [showOptionsModal, project?.id]);

  const handleCreateBoardSubmit = async () => {
    if (!newBoardName.trim()) {
      setCreateBoardError('Please enter a board name');
      return;
    }
    if (!project?.id) {
      setCreateBoardError('No active project selected');
      return;
    }

    try {
      setCreatingBoard(true);
      setCreateBoardError('');
      const res = await api.post(`/projects/${project.id}/boards`, {
        name: newBoardName.trim(),
      });
      if (res.data?.data) {
        const createdBoard = res.data.data;
        setNewBoardName('');
        setShowCreateBoardModal(false);
        if (onSelectBoard) {
          onSelectBoard(createdBoard.id);
        }
      } else {
        setCreateBoardError(res.data?.message || 'Failed to create board');
      }
    } catch (err: any) {
      console.log('[mobile-app] Error creating board:', err);
      setCreateBoardError(err.response?.data?.message || err.message || 'Failed to create board');
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleAddProjectMember = async (userId: string) => {
    if (!project?.id) return;
    try {
      setActionLoadingId(userId);
      setModalMsg(null);
      await api.post(`/projects/${project.id}/members`, { userId });
      await fetchProjectMembers();
    } catch (err: any) {
      console.log('[mobile-app] Error adding project member:', err);
      setModalMsg(err.response?.data?.message || 'Failed to add team member to project');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveProjectMember = async (userId: string) => {
    if (!project?.id) return;
    try {
      setActionLoadingId(userId);
      setModalMsg(null);
      await api.delete(`/projects/${project.id}/members/${userId}`);
      await fetchProjectMembers();
    } catch (err: any) {
      console.log('[mobile-app] Error removing project member:', err);
      setModalMsg(err.response?.data?.message || 'Failed to remove team member');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetProjectHead = async (userId: string) => {
    if (!project?.id) return;
    try {
      setActionLoadingId(userId);
      setModalMsg(null);
      await api.patch(`/projects/${project.id}/head`, { userId });
      await fetchProjectMembers();
    } catch (err: any) {
      console.log('[mobile-app] Error setting project head:', err);
      setModalMsg(err.response?.data?.message || 'Failed to set project head');
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeCol = defaultCols.find((c) => c.id === activeColumnId) || defaultCols[0];

  const colTasks = tasks.filter((t) => {
    if (t.columnId) {
      if (t.columnId !== activeCol.id) return false;
    } else if (t.status && activeCol.name) {
      if (t.status.toLowerCase().trim() !== activeCol.name.toLowerCase().trim()) return false;
    }
    if (query.trim() && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const totalCompleted = tasks.filter(
    (t) => t.status?.toLowerCase().includes('done') || t.status?.toLowerCase().includes('complete')
  ).length;

  const completionPct = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  // Workspace members not yet in this project
  const projectUserIds = new Set(projectMembers.map((pm) => pm.userId || pm.user?.id));
  const availableWorkspaceMembers = workspaceMembers.filter((wm) => {
    const uId = wm.userId || wm.user?.id || wm.id;
    return uId && !projectUserIds.has(uId);
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title={project?.name || 'Project Board'}
          subtitle={`${tasks.length} tasks · ${completionPct}% complete`}
          onBack={onBack}
          rightActionText="•••"
          onRightAction={() => {
            setModalMsg(null);
            setShowOptionsModal(true);
          }}
        />

        {/* Board Bar Selector & Create Board Button */}
        <View style={styles.boardSelectorContainer}>
          <Text style={[styles.boardSelectorLabel, { color: colors.textMuted }]}>Boards:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.boardSelectorRow}>
            {boards.map((b) => {
              const isActive = activeBoardId === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.boardPill,
                    {
                      backgroundColor: isActive ? colors.red : colors.surface,
                      borderColor: isActive ? colors.red : colors.border,
                    },
                  ]}
                  onPress={() => onSelectBoard && onSelectBoard(b.id)}
                >
                  <Text style={[styles.boardPillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.boardPill, { backgroundColor: colors.redBg, borderColor: colors.red }]}
              onPress={() => {
                setCreateBoardError('');
                setNewBoardName('');
                setShowCreateBoardModal(true);
              }}
            >
              <Text style={[styles.boardPillText, { color: colors.redLight, fontWeight: '700' }]}>
                + New Board
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.boardTabsRow}
          contentContainerStyle={styles.pillRowContent}
        >
          {defaultCols.map((col) => {
            const count = tasks.filter((t) => t.columnId === col.id).length;
            const isActive = activeCol.id === col.id;
            return (
              <TouchableOpacity
                key={col.id}
                style={[
                  styles.boardTab,
                  {
                    backgroundColor: isActive ? colors.redBg : colors.surface,
                    borderColor: isActive ? colors.red : colors.border,
                  },
                ]}
                onPress={() => setActiveColumnId(col.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.boardTabText, { color: isActive ? colors.redLight : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                  {col.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeCol.name}</Text>
          <TouchableOpacity onPress={onCreateTask}>
            <Text style={[styles.addTaskText, { color: colors.redLight }]}>+ Add task</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {colTasks.length > 0 ? (
            colTasks.map((t) => (
              <TaskCard
                key={t.id}
                title={t.title}
                description={t.description}
                priority={t.priority as any}
                dueDate={t.dueDate}
                assigneeName={t.assignee?.name || (t.assigneeId ? 'Assigned' : undefined)}
                status={t.status}
                isCompleted={t.isCompleted}
                projectName={t.projectName || project?.name}
                onPress={() => onSelectTask(t)}
              />
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks in {activeCol.name}</Text>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.red }]} onPress={onCreateTask}>
                <Text style={styles.createBtnText}>+ Create Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Board Modal */}
      <Modal visible={showCreateBoardModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Board</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Create a new board in {project?.name || 'this project'}. Default columns (To Do, In Progress, Review, Done) will be automatically created.
            </Text>

            {createBoardError ? (
              <View style={[styles.modalMsgBox, { borderColor: colors.red, backgroundColor: colors.redBg }]}>
                <Text style={[styles.modalMsgText, { color: colors.redLight }]}>{createBoardError}</Text>
              </View>
            ) : null}

            <TextInput
              style={[
                styles.boardInput,
                { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. Sprint Board, Backlog, QA Kanban"
              placeholderTextColor={colors.textMuted}
              value={newBoardName}
              onChangeText={setNewBoardName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.smallCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowCreateBoardModal(false)}
                disabled={creatingBoard}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallSubmitBtn, { backgroundColor: colors.red }]}
                onPress={handleCreateBoardSubmit}
                disabled={creatingBoard}
              >
                {creatingBoard ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>Create Board</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Options & Team Management Modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {project?.name || 'Project'} Settings & Team
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Manage project team members and settings.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Text style={[styles.closeXText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalMsg && (
              <View style={[styles.modalMsgBox, { borderColor: colors.red, backgroundColor: colors.redBg }]}>
                <Text style={[styles.modalMsgText, { color: colors.redLight }]}>{modalMsg}</Text>
              </View>
            )}

            {/* Modal Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[
                  styles.tabItem,
                  { borderBottomColor: activeModalTab === 'team' ? colors.red : 'transparent' },
                ]}
                onPress={() => setActiveModalTab('team')}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    {
                      color: activeModalTab === 'team' ? colors.redLight : colors.textMuted,
                      fontWeight: activeModalTab === 'team' ? '700' : '600',
                    },
                  ]}
                >
                  👥 Manage Team ({projectMembers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabItem,
                  { borderBottomColor: activeModalTab === 'info' ? colors.red : 'transparent' },
                ]}
                onPress={() => setActiveModalTab('info')}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    {
                      color: activeModalTab === 'info' ? colors.redLight : colors.textMuted,
                      fontWeight: activeModalTab === 'info' ? '700' : '600',
                    },
                  ]}
                >
                  ℹ️ Project Info
                </Text>
              </TouchableOpacity>
            </View>

            {activeModalTab === 'team' ? (
              <ScrollView style={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
                {/* Current Project Members */}
                <Text style={[styles.sectionSubtitle, { color: colors.textSubtle }]}>Current Team Members</Text>

                {loadingMembers ? (
                  <ActivityIndicator size="small" color={colors.red} style={{ marginVertical: 15 }} />
                ) : projectMembers.length > 0 ? (
                  <View style={[styles.membersCard, { borderColor: colors.border }]}>
                    {projectMembers.map((pm, idx) => {
                      const uName = pm.user?.name || pm.name || 'Project Member';
                      const uEmail = pm.user?.email || pm.email || '';
                      const uId = pm.userId || pm.user?.id || pm.id;
                      const isHead = pm.role === 'head';
                      const isBusy = actionLoadingId === uId;

                      return (
                        <View
                          key={uId || idx}
                          style={[
                            styles.memberRow,
                            { borderBottomColor: colors.border },
                            idx === projectMembers.length - 1 && styles.lastRow,
                          ]}
                        >
                          <Avatar letter={uName} isRed={isHead} size="small" />

                          <View style={styles.memberInfo}>
                            <View style={styles.nameRow}>
                              <Text style={[styles.memberName, { color: colors.text }]}>{uName}</Text>
                              {isHead && <Text style={[styles.headTag, { color: colors.redLight }]}> (Project Head)</Text>}
                            </View>
                            {uEmail ? <Text style={[styles.memberEmail, { color: colors.textMuted }]}>{uEmail}</Text> : null}
                          </View>

                          {isBusy ? (
                            <ActivityIndicator size="small" color={colors.red} />
                          ) : (
                            <View style={styles.memberActions}>
                              {!isHead && (
                                <TouchableOpacity
                                  style={[styles.smallBtn, { borderColor: colors.border }]}
                                  onPress={() => handleSetProjectHead(uId)}
                                >
                                  <Text style={[styles.smallBtnText, { color: colors.redLight }]}>Make Head</Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.smallBtn, { borderColor: colors.border }]}
                                onPress={() => handleRemoveProjectMember(uId)}
                              >
                                <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>Remove</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.emptySubText, { color: colors.textMuted }]}>No team members assigned to this project yet.</Text>
                )}

                {/* Add Team Members from Workspace */}
                <Text style={[styles.sectionSubtitle, { color: colors.textSubtle, marginTop: 18 }]}>Add Workspace Member to Project</Text>

                {availableWorkspaceMembers.length > 0 ? (
                  <View style={[styles.membersCard, { borderColor: colors.border }]}>
                    {availableWorkspaceMembers.map((wm, idx) => {
                      const u = wm.user;
                      const uName = u?.name || (wm as any).name || 'Workspace Member';
                      const uEmail = u?.email || (wm as any).email || '';
                      const uId = wm.userId || u?.id || wm.id;
                      const isBusy = actionLoadingId === uId;

                      return (
                        <View
                          key={uId || idx}
                          style={[
                            styles.memberRow,
                            { borderBottomColor: colors.border },
                            idx === availableWorkspaceMembers.length - 1 && styles.lastRow,
                          ]}
                        >
                          <Avatar letter={uName} size="small" />

                          <View style={styles.memberInfo}>
                            <Text style={[styles.memberName, { color: colors.text }]}>{uName}</Text>
                            {uEmail ? <Text style={[styles.memberEmail, { color: colors.textMuted }]}>{uEmail}</Text> : null}
                          </View>

                          {isBusy ? (
                            <ActivityIndicator size="small" color={colors.red} />
                          ) : (
                            <TouchableOpacity
                              style={[styles.addBtn, { backgroundColor: colors.red }]}
                              onPress={() => handleAddProjectMember(uId)}
                            >
                              <Text style={styles.addBtnText}>+ Add to Project</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                    {workspaceMembers.length === 0
                      ? 'No workspace members available.'
                      : 'All workspace members are already added to this project.'}
                  </Text>
                )}
              </ScrollView>
            ) : (
              <ScrollView style={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Project Name</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>{project?.name}</Text>

                  <Text style={[styles.infoLabel, { color: colors.textMuted, marginTop: 12 }]}>Description</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>
                    {project?.description || 'Active taskboard project for your team.'}
                  </Text>

                  <Text style={[styles.infoLabel, { color: colors.textMuted, marginTop: 12 }]}>Progress & Tasks</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>
                    {tasks.length} Total Tasks ({totalCompleted} Completed · {completionPct}%)
                  </Text>

                  <TouchableOpacity
                    style={[styles.createTaskModalBtn, { backgroundColor: colors.red }]}
                    onPress={() => {
                      setShowOptionsModal(false);
                      setCreateBoardError('');
                      setNewBoardName('');
                      setShowCreateBoardModal(true);
                    }}
                  >
                    <Text style={styles.createTaskModalBtnText}>+ Create New Board</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.createTaskModalBtn, { backgroundColor: colors.red, marginTop: 10 }]}
                    onPress={() => {
                      setShowOptionsModal(false);
                      onCreateTask();
                    }}
                  >
                    <Text style={styles.createTaskModalBtnText}>+ Create New Task</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
  boardSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  boardSelectorLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  boardSelectorRow: {
    flexDirection: 'row',
  },
  boardPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  boardPillText: {
    fontSize: 11,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 13,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
  },
  boardTabsRow: {
    marginBottom: 16,
  },
  pillRowContent: {
    gap: 8,
  },
  boardTab: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  boardTabText: {
    fontSize: 11,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  addTaskText: {
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    gap: 9,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
  },
  createBtn: {
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeXText: {
    fontSize: 16,
    padding: 4,
  },
  modalMsgBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 9,
    marginBottom: 10,
  },
  modalMsgText: {
    fontSize: 11,
    fontWeight: '600',
  },
  boardInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  smallCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b2b',
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabItemText: {
    fontSize: 11,
  },
  tabScrollContent: {
    maxHeight: 340,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  membersCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 11,
    fontWeight: '700',
  },
  headTag: {
    fontSize: 9,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 9,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 5,
  },
  smallBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  smallBtnText: {
    fontSize: 9,
    fontWeight: '700',
  },
  addBtn: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  emptySubText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 6,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  createTaskModalBtn: {
    marginTop: 18,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  createTaskModalBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
