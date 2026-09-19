import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';
import { Task } from '../../types';
import api from '../../api/client';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
}

export default function HomeScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const { activeWorkspace, workspaces, fetchWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  const { projects, fetchProjects, setActiveProject } = useProjectStore();
  const [stats, setStats] = useState<DashboardStats>({ totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0 });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      const [projectsResult] = await Promise.allSettled([
        fetchProjects(activeWorkspace.id),
        (async () => {
          const { data } = await api.get(`/workspaces/${activeWorkspace.id}/analytics`);
          setStats(data.data);
        })(),
      ]);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) loadData();
  }, [activeWorkspace]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const statCards = [
    { label: 'Total Tasks', value: stats.totalTasks, icon: 'layers-outline', color: colors.info },
    { label: 'Completed', value: stats.completedTasks, icon: 'checkmark-circle-outline', color: colors.success },
    { label: 'In Progress', value: stats.inProgressTasks, icon: 'time-outline', color: colors.warning },
    { label: 'Overdue', value: stats.overdueTasks, icon: 'alert-circle-outline', color: colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},
            </Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name?.split(' ')[0]}</Text>
          </View>
          {activeWorkspace && (
            <TouchableOpacity
              style={[styles.workspaceBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}
              onPress={() => setShowWorkspacePicker(true)}
            >
              <Text style={[styles.workspaceName, { color: colors.textPrimary }]} numberOfLines={1}>
                {activeWorkspace.name}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <View style={styles.statsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 10 }} />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>-</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Loading...</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
              onPress={() => navigation.navigate('Board')}
            >
              <Ionicons name="grid" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Board</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
              onPress={() => navigation.navigate('MyWork')}
            >
              <Ionicons name="briefcase" size={24} color={colors.warning} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>My Work</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Ionicons name="calendar" size={24} color={colors.info} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
              onPress={() => navigation.navigate('Activity')}
            >
              <Ionicons name="pulse" size={24} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Activity</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Projects</Text>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[styles.projectCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                onPress={() => {
                  setActiveProject(project);
                  navigation.navigate('Project', { projectId: project.id });
                }}
              >
                <View style={[styles.projectIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="folder-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={[styles.projectName, { color: colors.textPrimary }]}>{project.name}</Text>
                  {project.description && (
                    <Text style={[styles.projectDesc, { color: colors.textMuted }]} numberOfLines={1}>
                      {project.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showWorkspacePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkspacePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWorkspacePicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bgSurface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Switch Workspace</Text>
              <TouchableOpacity onPress={() => setShowWorkspacePicker(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={workspaces}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.workspaceItem,
                    { backgroundColor: item.id === activeWorkspace?.id ? colors.primaryLight : 'transparent' },
                  ]}
                  onPress={() => {
                    setActiveWorkspace(item);
                    setShowWorkspacePicker(false);
                  }}
                >
                  <View style={[styles.workspaceIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.workspaceIconText, { color: colors.primary }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.workspaceItemInfo}>
                    <Text style={[styles.workspaceItemName, { color: colors.textPrimary }]}>{item.name}</Text>
                  </View>
                  {item.id === activeWorkspace?.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={[styles.modalEmptyText, { color: colors.textMuted }]}>No workspaces</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 14, marginBottom: 4 },
  userName: { fontSize: 26, fontWeight: '700' },
  workspaceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 6 },
  workspaceName: { fontSize: 13, fontWeight: '500', maxWidth: 140 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', padding: 16, borderRadius: 10, borderWidth: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center', gap: 8 },
  actionText: { fontSize: 13, fontWeight: '500' },
  projectCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 12 },
  projectIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  projectDesc: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  workspaceItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  workspaceIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  workspaceIconText: { fontSize: 16, fontWeight: '700' },
  workspaceItemInfo: { flex: 1 },
  workspaceItemName: { fontSize: 15, fontWeight: '500' },
  modalEmpty: { padding: 32, alignItems: 'center' },
  modalEmptyText: { fontSize: 14 },
});
