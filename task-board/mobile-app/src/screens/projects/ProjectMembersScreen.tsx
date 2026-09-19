import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore, ProjectMember } from '../../stores/projectStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export default function ProjectMembersScreen({ route, navigation }: any) {
  const { projectId, projectName } = route.params;
  const { colors } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const { projectMembers, fetchProjectMembers, addProjectMember, removeProjectMember, setProjectHead } = useProjectStore();
  const { members: workspaceMembers, fetchMembers, activeWorkspace } = useWorkspaceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);

  const myProjectRole = projectMembers.find((m) => m.id === user?.id)?.role;
  const myWorkspaceRole = workspaceMembers.find((m) => m.id === user?.id)?.role;
  const canManage = myProjectRole === 'head' || myWorkspaceRole === 'owner' || myWorkspaceRole === 'admin';

  useEffect(() => {
    fetchProjectMembers(projectId);
    if (activeWorkspace) fetchMembers(activeWorkspace.id);
  }, [projectId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjectMembers(projectId);
    if (activeWorkspace) await fetchMembers(activeWorkspace.id);
    setRefreshing(false);
  };

  const nonProjectMembers = workspaceMembers.filter(
    (wm) => !projectMembers.some((pm) => pm.id === wm.id)
  );

  const handleAddMember = async (userId: string) => {
    await addProjectMember(projectId, userId);
    setShowAddPicker(false);
  };

  const handleRemoveMember = (member: ProjectMember) => {
    Alert.alert('Remove Member', `Remove ${member.name} from this project?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeProjectMember(projectId, member.id),
      },
    ]);
  };

  const handleSetHead = (member: ProjectMember) => {
    Alert.alert('Set Project Head', `Set ${member.name} as project head?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Set Head',
        onPress: () => setProjectHead(projectId, member.id),
      },
    ]);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'head') return { bg: colors.warningLight, text: colors.warning, label: 'HEAD' };
    return { bg: colors.bgSurfaceElevated, text: colors.textMuted, label: 'MEMBER' };
  };

  const renderMember = ({ item }: { item: ProjectMember }) => {
    const badge = getRoleBadge(item.role);
    const isCurrentUser = item.id === user?.id;

    return (
      <View style={[styles.memberCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            {isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.youText, { color: colors.primary }]}>YOU</Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
        </View>

        <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.roleText, { color: badge.text }]}>{badge.label}</Text>
        </View>

        {canManage && !isCurrentUser && (
          <View style={styles.actions}>
            {item.role !== 'head' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetHead(item)}>
                <Ionicons name="star-outline" size={18} color={colors.warning} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemoveMember(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {projectName || 'Project Team'}
        </Text>
        {canManage && (
          <TouchableOpacity onPress={() => setShowAddPicker(!showAddPicker)}>
            <Ionicons name={showAddPicker ? 'close' : 'person-add-outline'} size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
        {!canManage && <View style={{ width: 22 }} />}
      </View>

      {showAddPicker && canManage && (
        <View style={[styles.addPicker, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.addPickerTitle, { color: colors.textPrimary }]}>Add from workspace</Text>
          {nonProjectMembers.length === 0 ? (
            <Text style={[styles.addPickerEmpty, { color: colors.textMuted }]}>All workspace members are already in this project</Text>
          ) : (
            <FlatList
              data={nonProjectMembers}
              keyExtractor={(item) => item.id}
              renderItem={({ item: wm }) => (
                <TouchableOpacity
                  style={[styles.addMemberRow, { borderBottomColor: colors.borderSubtle }]}
                  onPress={() => handleAddMember(wm.id)}
                >
                  <View style={[styles.addAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.addAvatarText, { color: colors.primary }]}>{wm.name ? wm.name.charAt(0).toUpperCase() : '?'}</Text>
                  </View>
                  <View style={styles.addMemberInfo}>
                    <Text style={[styles.addMemberName, { color: colors.textPrimary }]} numberOfLines={1}>{wm.name}</Text>
                    <Text style={[styles.addMemberEmail, { color: colors.textMuted }]} numberOfLines={1}>{wm.email}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
              style={styles.addList}
            />
          )}
        </View>
      )}

      <FlatList
        data={projectMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PROJECT MEMBERS ({projectMembers.length})</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members yet</Text>
            {canManage && (
              <TouchableOpacity style={[styles.addFirstBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAddPicker(true)}>
                <Text style={styles.addFirstBtnText}>Add First Member</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 10 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  addPicker: { borderBottomWidth: 1, padding: 14 },
  addPickerTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  addPickerEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  addList: { maxHeight: 200 },
  addMemberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, gap: 10 },
  addAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  addAvatarText: { fontSize: 13, fontWeight: '600' },
  addMemberInfo: { flex: 1 },
  addMemberName: { fontSize: 14, fontWeight: '500' },
  addMemberEmail: { fontSize: 12 },
  listContent: { padding: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
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
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14 },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  addFirstBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
