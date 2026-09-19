import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { WorkspaceMember, WorkspaceInvite } from '../../types';
import api from '../../api/client';
import Clipboard from 'expo-clipboard';

type Tab = 'members' | 'invite' | 'link';

export default function MembersScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const { activeWorkspace, members, fetchMembers, removeMember } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [refreshing, setRefreshing] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);

  const userRole = members.find((m) => m.id === user?.id)?.role || 'member';
  const canManage = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    if (activeWorkspace) {
      fetchMembers(activeWorkspace.id);
      fetchInvites();
    }
  }, [activeWorkspace]);

  const fetchInvites = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace.id}/invites`);
      setInvites(data.data || []);
    } catch {}
  };

  const onRefresh = async () => {
    if (!activeWorkspace) return;
    setRefreshing(true);
    await fetchMembers(activeWorkspace.id);
    await fetchInvites();
    setRefreshing(false);
  };

  const handleInviteEmail = async () => {
    if (!inviteEmail.trim() || !activeWorkspace) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteSuccess(true);
      setInviteEmail('');
      await fetchMembers(activeWorkspace.id);
      await fetchInvites();
    } catch (error: any) {
      setInviteError(error?.response?.data?.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleCreateLink = async () => {
    if (!activeWorkspace) return;
    setCreatingLink(true);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace.id}/invites/link`);
      const token = data.data?.token || data.token;
      setShareableLink(`https://taskboard.app/join-workspace?token=${token}`);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to generate link');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareableLink) return;
    await Clipboard.setStringAsync(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    if (!shareableLink) return;
    await Share.share({ message: `Join my workspace on Task Board:\n${shareableLink}`, title: 'Workspace Invite' });
  };

  const handleRevokeInvite = (invite: WorkspaceInvite) => {
    Alert.alert('Revoke Invite', `Revoke the invite for ${invite.email || 'shareable link'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive',
        onPress: async () => {
          if (!activeWorkspace) return;
          await api.delete(`/workspaces/${activeWorkspace.id}/invites/${invite.id}`);
          setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        },
      },
    ]);
  };

  const handleRemoveMember = (member: WorkspaceMember) => {
    Alert.alert('Remove Member', `Remove ${member.name} from this workspace?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          if (!activeWorkspace) return;
          await removeMember(activeWorkspace.id, member.id);
        },
      },
    ]);
  };

  const handleChangeRole = (member: WorkspaceMember, newRole: 'admin' | 'member') => {
    if (!activeWorkspace) return;
    Alert.alert('Change Role', `Change ${member.name}'s role to ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change',
        onPress: async () => {
          await api.patch(`/workspaces/${activeWorkspace.id}/members/${member.id}`, { role: newRole });
          await fetchMembers(activeWorkspace.id);
        },
      },
    ]);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return { bg: colors.primaryLight, text: colors.primary };
      case 'admin': return { bg: colors.warningLight, text: colors.warning };
      default: return { bg: colors.bgSurfaceElevated, text: colors.textMuted };
    }
  };

  const renderMember = ({ item }: { item: WorkspaceMember }) => {
    if (!item) return null;
    const roleBadge = getRoleBadge(item.role || 'member');
    const memberName = item.name || '';
    const memberEmail = item.email || '';
    const memberId = item.id || '';
    const isCurrentUser = memberId === (user && user.id);
    const canRemove = canManage && item.role !== 'owner' && !isCurrentUser;
    const canChangeRole = userRole === 'owner' && item.role !== 'owner' && !isCurrentUser;

    return (
      <View style={[styles.memberCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{memberName ? memberName.charAt(0).toUpperCase() : '?'}</Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>{memberName}</Text>
            {isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.youText, { color: colors.primary }]}>YOU</Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>{memberEmail}</Text>
        </View>
        {canChangeRole ? (
          <TouchableOpacity
            style={[styles.roleBtn, { backgroundColor: item.role === 'admin' ? colors.warningLight : colors.bgSurfaceElevated }]}
            onPress={() => handleChangeRole(item, item.role === 'admin' ? 'member' : 'admin')}
          >
            <Text style={[styles.roleBtnText, { color: item.role === 'admin' ? colors.warning : colors.textSecondary }]}>
              {item.role === 'admin' ? 'ADMIN' : 'MEMBER'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
            <Text style={[styles.roleText, { color: roleBadge.text }]}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</Text>
          </View>
        )}
        {canRemove && (
          <TouchableOpacity onPress={() => handleRemoveMember(item)} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderInviteTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: colors.textPrimary }]}>Invite by Email</Text>
      <Text style={[styles.tabDesc, { color: colors.textSecondary }]}>Send an email invitation to join this workspace.</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
        value={inviteEmail}
        onChangeText={(text) => { setInviteEmail(text); setInviteError(null); setInviteSuccess(false); }}
        placeholder="user@example.com"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={[styles.label, { color: colors.textSecondary }]}>Role</Text>
      <View style={styles.rolePicker}>
        {(['member', 'admin'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleOption, { backgroundColor: inviteRole === r ? colors.primaryLight : colors.bgInput, borderColor: inviteRole === r ? colors.primary : colors.borderInput }]}
            onPress={() => setInviteRole(r)}
          >
            <Text style={[styles.roleOptionText, { color: inviteRole === r ? colors.primary : colors.textSecondary }]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.inviteBtn, { backgroundColor: colors.primary }, inviting && { opacity: 0.6 }]}
        onPress={handleInviteEmail}
        disabled={inviting || !inviteEmail.trim()}
      >
        <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
        <Text style={styles.inviteBtnText}>{inviting ? 'Sending...' : 'Invite'}</Text>
      </TouchableOpacity>
      {inviteError && (
        <View style={[styles.messageBox, { backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.messageText, { color: colors.danger }]}>{inviteError}</Text>
        </View>
      )}
      {inviteSuccess && (
        <View style={[styles.messageBox, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.messageText, { color: colors.success }]}>Member invited successfully!</Text>
        </View>
      )}
    </View>
  );

  const renderLinkTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: colors.textPrimary }]}>Shareable Join Link</Text>
      <Text style={[styles.tabDesc, { color: colors.textSecondary }]}>Generate a link that anyone can use to join this workspace.</Text>
      {shareableLink ? (
        <>
          <View style={[styles.linkBox, { backgroundColor: colors.bgInput, borderColor: colors.borderInput }]}>
            <Text style={[styles.linkText, { color: colors.textPrimary }]} numberOfLines={2}>{shareableLink}</Text>
          </View>
          <View style={styles.linkActions}>
            <TouchableOpacity style={[styles.linkActionBtn, { backgroundColor: colors.primary }]} onPress={handleCopyLink}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#FFFFFF" />
              <Text style={styles.linkActionText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linkActionBtn, { backgroundColor: colors.bgSurfaceElevated, borderColor: colors.borderDefault, borderWidth: 1 }]} onPress={handleShareLink}>
              <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.linkActionText, { color: colors.textPrimary }]}>Share</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.infoBox, { backgroundColor: colors.bgSurfaceElevated }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>This link expires in 7 days. Anyone with this link can join as a member.</Text>
          </View>
          <TouchableOpacity style={styles.regenerateBtn} onPress={handleCreateLink} disabled={creatingLink}>
            <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.regenerateText, { color: colors.textSecondary }]}>{creatingLink ? 'Generating...' : 'Regenerate'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary }, creatingLink && { opacity: 0.6 }]} onPress={handleCreateLink} disabled={creatingLink}>
          <Ionicons name="link-outline" size={18} color="#FFFFFF" />
          <Text style={styles.generateBtnText}>{creatingLink ? 'Generating...' : 'Generate Join Link'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'members', label: `Members (${members.length})` },
    ...(canManage ? [{ key: 'invite' as Tab, label: 'Invite' }, { key: 'link' as Tab, label: 'Share Link' }] : []),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Team</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabsRow, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textMuted }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'members' && (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            invites.length > 0 ? (
              <View style={styles.pendingSection}>
                <Text style={[styles.pendingTitle, { color: colors.textMuted }]}>Pending Invites ({invites.length})</Text>
                {invites.map((inv) => (
                  <View key={inv.id} style={[styles.pendingCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                    <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.pendingEmail, { color: colors.textSecondary }]} numberOfLines={1}>{inv.email || 'Shareable link'}</Text>
                    <TouchableOpacity onPress={() => handleRevokeInvite(inv)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members found</Text>
            </View>
          }
        />
      )}

      {activeTab === 'invite' && (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {renderInviteTab()}
        </ScrollView>
      )}

      {activeTab === 'link' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderLinkTab()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 10 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  scrollContent: { padding: 16 },
  listContent: { padding: 12 },
  tabContent: { gap: 12 },
  tabTitle: { fontSize: 17, fontWeight: '700' },
  tabDesc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  label: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  rolePicker: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  roleOptionText: { fontSize: 13, fontWeight: '600' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8, marginTop: 8 },
  inviteBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  messageBox: { padding: 12, borderRadius: 8 },
  messageText: { fontSize: 13, fontWeight: '500' },
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600' },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  memberName: { fontSize: 14, fontWeight: '500' },
  youBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  youText: { fontSize: 9, fontWeight: '700' },
  memberEmail: { fontSize: 12 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  roleText: { fontSize: 11, fontWeight: '600' },
  roleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  roleBtnText: { fontSize: 11, fontWeight: '700' },
  removeBtn: { padding: 6 },
  linkBox: { padding: 14, borderRadius: 8, borderWidth: 1 },
  linkText: { fontSize: 13, lineHeight: 18 },
  linkActions: { flexDirection: 'row', gap: 10 },
  linkActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 6 },
  linkActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  infoBox: { flexDirection: 'row', padding: 12, borderRadius: 8, gap: 8, alignItems: 'flex-start' },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },
  regenerateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 4, marginTop: 4 },
  regenerateText: { fontSize: 13, fontWeight: '500' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8 },
  generateBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  pendingSection: { marginBottom: 16 },
  pendingTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  pendingCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6, gap: 8 },
  pendingEmail: { flex: 1, fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14 },
});
