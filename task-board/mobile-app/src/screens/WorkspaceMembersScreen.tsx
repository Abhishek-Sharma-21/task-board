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
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { WorkspaceMember } from '../types';
import { api } from '../services/api';

interface WorkspaceMembersScreenProps {
  workspaceId?: string | null;
  workspaceName?: string;
  members?: WorkspaceMember[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onMemberInvited?: () => void;
  onBack: () => void;
}

export const WorkspaceMembersScreen: React.FC<WorkspaceMembersScreenProps> = ({
  workspaceId,
  workspaceName = 'Workspace',
  members: propMembers = [],
  isLoading: propIsLoading = false,
  onRefresh,
  onMemberInvited,
  onBack,
}) => {
  const { colors } = useTheme();
  const [internalMembers, setInternalMembers] = useState<WorkspaceMember[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!workspaceId) return;
    try {
      setFetching(true);
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      if (res.data?.data) {
        setInternalMembers(res.data.data);
      }
    } catch (e) {
      console.log('[mobile-app] Error fetching workspace members:', e);
    } finally {
      setFetching(false);
    }
  };

  React.useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  const activeMembers = propMembers.length > 0 ? propMembers : internalMembers;
  const loadingState = propIsLoading || fetching;

  const handleInviteSubmit = async () => {
    if (!inviteEmail.trim()) {
      setErrorMsg('Please enter an email address');
      return;
    }
    if (!workspaceId) {
      setErrorMsg('No active workspace selected');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await api.post(`/workspaces/${workspaceId}/members`, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });

      setShowInviteModal(false);
      setInviteEmail('');
      await fetchMembers();
      if (onMemberInvited) onMemberInvited();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.log('[mobile-app] Error inviting member:', err);
      const msg = err.response?.data?.message || 'Failed to invite member. Please verify user email.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMemberRole = async (targetMember: WorkspaceMember) => {
    if (!workspaceId) return;
    if (targetMember.role === 'owner') return; // Cannot alter owner role

    const targetUserId = targetMember.userId || targetMember.id;
    const newRole = targetMember.role === 'admin' ? 'member' : 'admin';

    try {
      setUpdatingMemberId(targetMember.id);
      await api.patch(`/workspaces/${workspaceId}/members/${targetUserId}`, {
        role: newRole,
      });
      await fetchMembers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.log('[mobile-app] Error updating member role:', err);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loadingState} onRefresh={onRefresh ? onRefresh : fetchMembers} tintColor={colors.red} />
      }
    >
      <Header
        title="Workspace Members"
        subtitle={`${activeMembers.length} members in ${workspaceName}`}
        rightActionText="+ Invite"
        onRightAction={() => setShowInviteModal(true)}
        onBack={onBack}
      />

      <Text style={[styles.hintText, { color: colors.textMuted }]}>
        Tap a team member's role badge below to toggle their role between Member and Head / Admin.
      </Text>

      {activeMembers.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {activeMembers.map((m, idx) => {
            const userName = m.user?.name || (m as any).name || 'Workspace Member';
            const userEmail = m.user?.email || (m as any).email || 'member@example.com';
            const isOwner = m.role === 'owner';
            const isAdminHead = m.role === 'admin';
            const isUpdating = updatingMemberId === m.id;

            return (
              <View
                key={m.id}
                style={[
                  styles.memberRow,
                  { borderBottomColor: colors.border },
                  idx === activeMembers.length - 1 && styles.lastRow,
                ]}
              >
                <Avatar letter={userName} isRed={isOwner || isAdminHead} />

                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]}>{userName}</Text>
                    {isAdminHead && <Text style={[styles.headBadgeText, { color: colors.redLight }]}> (Team Head)</Text>}
                  </View>
                  <Text style={[styles.email, { color: colors.textMuted }]}>{userEmail}</Text>
                </View>

                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.roleTag,
                      {
                        borderColor: isOwner
                          ? colors.red
                          : isAdminHead
                          ? colors.redLight
                          : colors.border,
                        backgroundColor: isAdminHead ? colors.redBg : 'transparent',
                      },
                    ]}
                    onPress={() => handleToggleMemberRole(m)}
                    disabled={isOwner}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        {
                          color: isOwner
                            ? colors.red
                            : isAdminHead
                            ? colors.redLight
                            : colors.textMuted,
                          fontWeight: isOwner || isAdminHead ? '700' : '500',
                        },
                      ]}
                    >
                      {isOwner ? '👑 Owner' : isAdminHead ? '⭐ Head / Admin' : '👤 Member'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No workspace members loaded yet.</Text>
          <TouchableOpacity
            style={[styles.inviteBtn, { backgroundColor: colors.red }]}
            onPress={() => setShowInviteModal(true)}
          >
            <Text style={styles.inviteBtnText}>+ Invite Member</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Invite Member Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Invite Workspace Member</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>Add team members to collaborate on tasks.</Text>

            {errorMsg && (
              <View style={[styles.errorBox, { borderColor: colors.red }]}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSubtle }]}>User Email *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  },
                ]}
                placeholder="colleague@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={inviteEmail}
                onChangeText={(txt) => {
                  setInviteEmail(txt);
                  if (errorMsg) setErrorMsg(null);
                }}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSubtle }]}>Role</Text>
              <View style={styles.rolePillRow}>
                {(['member', 'admin'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.rolePill,
                      { borderColor: colors.border, backgroundColor: colors.inputBg },
                      inviteRole === r && { backgroundColor: colors.red, borderColor: colors.red },
                    ]}
                    onPress={() => setInviteRole(r)}
                  >
                    <Text
                      style={[
                        styles.rolePillText,
                        { color: colors.textMuted },
                        inviteRole === r && styles.rolePillActiveText,
                      ]}
                    >
                      {r === 'admin' ? '⭐ HEAD / ADMIN' : '👤 MEMBER'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.red },
                  (!inviteEmail.trim() || isSubmitting) && styles.disabledBtn,
                ]}
                onPress={handleInviteSubmit}
                disabled={!inviteEmail.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
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
  hintText: {
    fontSize: 11,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
  },
  headBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  email: {
    fontSize: 10,
    marginTop: 3,
  },
  roleTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  roleText: {
    fontSize: 10,
  },
  emptyState: {
    padding: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
  },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteBtnText: {
    color: '#ffffff',
    fontSize: 11,
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
  modalSub: {
    fontSize: 11,
    marginBottom: 16,
  },
  errorBox: {
    padding: 10,
    backgroundColor: '#381617',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 11,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontSize: 12,
  },
  rolePillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rolePill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rolePillActiveText: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
