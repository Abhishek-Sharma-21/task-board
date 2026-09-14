import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Workspace, User } from '../types';
import { api } from '../services/api';

interface WorkspacesScreenProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  user?: User | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onWorkspaceCreated?: (ws: Workspace) => void;
  onDeleteWorkspace?: (workspaceId: string) => Promise<void>;
  onInviteMembers: () => void;
  onBack: () => void;
}

export const WorkspacesScreen: React.FC<WorkspacesScreenProps> = ({
  workspaces,
  activeWorkspace,
  user,
  onSelectWorkspace,
  onWorkspaceCreated,
  onDeleteWorkspace,
  onInviteMembers,
  onBack,
}) => {
  const { colors } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const displayWsList: Partial<Workspace & { membersCount?: number; bg?: string }>[] =
    workspaces.length > 0
      ? workspaces
      : [
          {
            id: 'ws-1',
            name: 'Acme Inc.',
            membersCount: 5,
            bg: colors.red,
            ownerId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'ws-2',
            name: 'Personal',
            membersCount: 1,
            bg: '#e91e63',
            ownerId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'ws-3',
            name: 'College Project',
            membersCount: 3,
            bg: '#188bd1',
            ownerId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

  const handleCreateWorkspace = async () => {
    if (!wsName.trim()) {
      setError('Please enter a workspace name');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/workspaces', { name: wsName.trim() });
      if (res.data?.success && res.data?.data) {
        const newWs = res.data.data;
        setWsName('');
        setIsModalOpen(false);
        if (onWorkspaceCreated) {
          onWorkspaceCreated(newWs);
        }
      } else {
        setError(res.data?.message || 'Failed to create workspace');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async (ws: Workspace) => {
    if (!onDeleteWorkspace) return;
    Alert.alert(
      'Delete Workspace',
      `PERMANENT ACTION: Are you sure you want to delete "${ws.name}"? All projects, boards, and tasks will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(ws.id);
            try {
              await onDeleteWorkspace(ws.id);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete workspace');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="Your Workspaces"
          subtitle="Select a workspace to continue"
          rightActionText="+ Create"
          onRightAction={() => {
            setError('');
            setWsName('');
            setIsModalOpen(true);
          }}
          onBack={onBack}
        />

        <View style={styles.list}>
          {displayWsList.map((ws) => {
            const isActive = activeWorkspace ? activeWorkspace.id === ws.id : ws.id === 'ws-1';
            const isOwner = user && ws.ownerId === user.id;
            return (
              <TouchableOpacity
                key={ws.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => onSelectWorkspace(ws as Workspace)}
              >
                <View style={[styles.wsIcon, { backgroundColor: ws.bg || colors.red }]}>
                  <Text style={styles.wsIconText}>{ws.name?.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.cardMain}>
                  <Text style={[styles.nameText, { color: colors.text }]}>{ws.name}</Text>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {ws.membersCount === 1 ? 'Only you' : `${ws.membersCount || 3} members`}{' '}
                    {isActive ? '· Active workspace' : ''}
                  </Text>
                </View>

                {isOwner && onDeleteWorkspace && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteWorkspace(ws as Workspace)}
                    disabled={deletingId === ws.id}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.redLight }]}>
                      {deletingId === ws.id ? '...' : '✕'}
                    </Text>
                  </TouchableOpacity>
                )}

                {isActive ? (
                  <Text style={[styles.activeCheck, { color: colors.redLight }]}>✓</Text>
                ) : (
                  <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Workspace Actions</Text>
        </View>

        <View style={[styles.actionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => {
              setError('');
              setWsName('');
              setIsModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>+</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionName, { color: colors.text }]}>Create Workspace</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Start a new team space</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={onInviteMembers} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
              <Text style={[styles.iconText, { color: colors.redLight }]}>↔</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionName, { color: colors.text }]}>Invite Members</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Collaborate with your team</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Workspace Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Workspace</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Enter a name for your new workspace.
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. Mobile Dev Team"
              placeholderTextColor={colors.textMuted}
              value={wsName}
              onChangeText={setWsName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsModalOpen(false)}
                disabled={creating}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.red }]}
                onPress={handleCreateWorkspace}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  list: {
    gap: 9,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wsIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  wsIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  cardMain: {
    flex: 1,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  metaText: {
    fontSize: 10,
  },
  activeCheck: {
    fontSize: 16,
    fontWeight: '800',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 18,
  },
  sectionHeading: {
    marginTop: 23,
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 10,
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
  actionInfo: {
    flex: 1,
  },
  actionName: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 10,
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
