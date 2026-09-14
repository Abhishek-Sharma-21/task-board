import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { ProjectCard } from '../components/ProjectCard';
import { User, Workspace, Project } from '../types';

interface HomeScreenProps {
  user: User | null;
  activeWorkspace: Workspace | null;
  projects: Project[];
  totalTaskCount?: number;
  assignedTaskCount?: number;
  overdueTaskCount?: number;
  unreadCount?: number;
  onNavigateProjects: () => void;
  onNavigateWorkspaces: () => void;
  onNavigateProfile: () => void;
  onNavigateNotifications: () => void;
  onSelectProject: (project: Project) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  activeWorkspace,
  projects,
  totalTaskCount = 0,
  assignedTaskCount = 0,
  overdueTaskCount = 0,
  unreadCount = 0,
  onNavigateProjects,
  onNavigateWorkspaces,
  onNavigateProfile,
  onNavigateNotifications,
  onSelectProject,
}) => {
  const { colors } = useTheme();

  const displayProjects = projects.slice(0, 5);

  const getProgress = (p: Project) => {
    if (p.taskCount && p.taskCount > 0 && p.completedTaskCount !== undefined) {
      return Math.round((p.completedTaskCount / p.taskCount) * 100);
    }
    return 0;
  };

  const getBgColor = (index: number) => {
    const bgList = [colors.red, '#e91e63', '#188bd1', '#e6a719'];
    return bgList[index % bgList.length];
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title={activeWorkspace?.name || 'Workspace'}
        subtitle="Your active workspace"
        workspaceName={activeWorkspace?.name || 'Workspace'}
        userName={user?.name || 'User'}
        unreadCount={unreadCount}
        onWorkspaceClick={onNavigateWorkspaces}
        onProfileClick={onNavigateProfile}
        onNotificationClick={onNavigateNotifications}
        onSearch={onNavigateProjects}
      />

      <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Welcome back 👋</Text>

      <Text style={[styles.heading, { color: colors.text }]}>
        {user?.name ? `${user.name}'s Dashboard` : "Let's make progress\ntoday."}
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard label="Projects" value={projects.length} icon="▦" />
          <StatCard label="Total Tasks" value={totalTaskCount} icon="☷" />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Assigned" value={assignedTaskCount} icon="♙" />
          <StatCard label="Overdue" value={overdueTaskCount} icon="!" />
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Projects</Text>
        <TouchableOpacity onPress={onNavigateProjects}>
          <Text style={[styles.viewAll, { color: colors.redLight }]}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.projectList}>
        {displayProjects.length > 0 ? (
          displayProjects.map((p, idx) => (
            <ProjectCard
              key={p.id}
              letter={p.name}
              name={p.name}
              meta={`${p.taskCount || 0} tasks · ${p.description || 'Active project'}`}
              progress={getProgress(p)}
              bg={getBgColor(idx)}
              onPress={() => onSelectProject(p)}
            />
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No projects in this workspace yet.</Text>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.red }]} onPress={onNavigateProjects}>
              <Text style={styles.createBtnText}>+ Create First Project</Text>
            </TouchableOpacity>
          </View>
        )}
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
  eyebrow: {
    fontSize: 12,
    marginBottom: 6,
  },
  heading: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
    marginBottom: 20,
  },
  statsGrid: {
    gap: 9,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 23,
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAll: {
    fontSize: 10,
    fontWeight: '700',
  },
  projectList: {
    gap: 8,
  },
  emptyState: {
    padding: 24,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
  },
  createBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
