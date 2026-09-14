import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { Avatar } from '../components/Avatar';
import { User, Task } from '../types';
import { api } from '../services/api';

interface SettingsScreenProps {
  user: User | null;
  workspaceId?: string;
  onNavigateWorkspaces: () => void;
  onNavigateMembers: () => void;
  onNavigateNotifications?: () => void;
  onSignOut: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  workspaceId,
  onNavigateWorkspaces,
  onNavigateMembers,
  onNavigateNotifications,
  onSignOut,
  onBack,
}) => {
  const { colors, themeMode, setThemeMode } = useTheme();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');

  // Completed Task History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const userName = user?.name || 'Workspace User';
  const userEmail = user?.email || 'user@example.com';

  const fetchCompletedHistory = async () => {
    if (!workspaceId) return;
    try {
      setLoadingHistory(true);
      const res = await api.get(`/workspaces/${workspaceId}/tasks/history`);
      if (res.data?.data) {
        setCompletedTasks(res.data.data);
      }
    } catch (err) {
      console.log('[mobile-app] Error fetching completed tasks history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setShowHistoryModal(true);
    fetchCompletedHistory();
  };

  const handleRestoreTask = async (taskId: string) => {
    try {
      setRestoringId(taskId);
      await api.post(`/tasks/${taskId}/restore`);
      setCompletedTasks((prev) => prev.filter((t) => t.id !== taskId));
      Alert.alert('Task Restored', 'The task has been restored back to your active board.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to restore task');
    } finally {
      setRestoringId(null);
    }
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: '☀️' },
    { mode: 'dark', label: 'Dark', icon: '🌙' },
    { mode: 'system', label: 'System', icon: '⚙️' },
  ];

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    Alert.alert('Profile Updated', `Name set to "${nameInput.trim() || userName}"`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.screenBack}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings & Profile</Text>
      </View>

      {/* Profile Card Header */}
      <View style={[styles.profileHeaderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Avatar letter={userName} size="large" isRed />
        <Text style={[styles.profileName, { color: colors.text }]}>{userName}</Text>
        <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{userEmail}</Text>

        <TouchableOpacity
          style={[styles.editProfileBtn, { backgroundColor: colors.redBg, borderColor: colors.red }]}
          onPress={() => setIsEditingProfile(!isEditingProfile)}
          activeOpacity={0.8}
        >
          <Text style={[styles.editProfileBtnText, { color: colors.redLight }]}>
            {isEditingProfile ? 'Cancel Editing' : '✎ Edit Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Details & Inline Edit */}
      {isEditingProfile && (
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textMuted }]}>EDIT PROFILE DETAILS</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 14 }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 10 }]}>Email Address (Read Only)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.textMuted }]}
              value={userEmail}
              editable={false}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.red }]}
              onPress={handleSaveProfile}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Account Section */}
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>ACCOUNT & PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => setIsEditingProfile(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>◎</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>Profile Information</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>{userName} · {userEmail}</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              if (onNavigateNotifications) onNavigateNotifications();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>♧</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>Manage notification preferences</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme / Appearance Group */}
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>APPEARANCE & THEME</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 14 }]}>
          <View style={styles.themeHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>◐</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>Theme Preference</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>Choose Light, Dark, or System Default</Text>
            </View>
          </View>

          <View style={styles.themeSelectorRow}>
            {themeOptions.map((opt) => {
              const isActive = themeMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[
                    styles.themePill,
                    {
                      borderColor: isActive ? colors.red : colors.border,
                      backgroundColor: isActive ? colors.red : colors.surface2,
                    },
                  ]}
                  onPress={() => setThemeMode(opt.mode)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.themePillIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.themePillText,
                      { color: isActive ? '#ffffff' : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Workspace Group */}
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>WORKSPACE & TEAM</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onNavigateWorkspaces} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>▦</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>Manage Workspaces</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>Switch or manage your workspaces</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onNavigateMembers} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>♙</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>Invite Members</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>Add people to your workspace</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleOpenHistory} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>✓</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>Completed Task History</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>View, filter & restore completed tasks</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Completed Task History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="fade" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Completed Task History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
              placeholder="Search completed tasks..."
              placeholderTextColor={colors.textMuted}
              value={historySearch}
              onChangeText={setHistorySearch}
            />

            {loadingHistory ? (
              <ActivityIndicator size="small" color={colors.red} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {completedTasks
                  .filter((t) => !historySearch.trim() || t.title.toLowerCase().includes(historySearch.toLowerCase()))
                  .map((t) => (
                    <View key={t.id} style={[styles.historyRow, { borderColor: colors.border }]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                          ✓ {t.title}
                        </Text>
                        <Text style={[styles.historySub, { color: colors.textMuted }]}>
                          📁 {t.projectName || 'Project'} • {t.boardName || 'Board'} • {new Date(t.updatedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.restoreBtn, { backgroundColor: colors.red }]}
                        onPress={() => handleRestoreTask(t.id)}
                        disabled={restoringId === t.id}
                      >
                        <Text style={styles.restoreBtnText}>
                          {restoringId === t.id ? 'Restoring...' : 'Restore'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                {completedTasks.length === 0 && (
                  <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, marginVertical: 20 }}>
                    No completed tasks found in history.
                  </Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.surface2, marginTop: 14 }]} onPress={() => setShowHistoryModal(false)}>
              <Text style={[styles.saveBtnText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Support & Sign Out */}
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>SUPPORT & LOGOUT</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => Alert.alert('TaskBoard Support', 'For assistance, contact support@taskboard.com.')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>?</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>Help & Support</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>Get help with TaskBoard</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={onSignOut} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>↪</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.redLight }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 16,
  },
  backText: {
    fontSize: 27,
    lineHeight: 27,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileHeaderCard: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 3,
  },
  editProfileBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  group: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  themePillIcon: {
    fontSize: 12,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconBox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 11,
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
  },
  desc: {
    fontSize: 10,
    marginTop: 3,
  },
  chevron: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  historySub: {
    fontSize: 10,
    marginTop: 2,
  },
  restoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  restoreBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
