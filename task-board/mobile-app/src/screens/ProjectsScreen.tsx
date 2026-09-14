import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { ProjectCard } from '../components/ProjectCard';
import { Project, Workspace } from '../types';

interface ProjectsScreenProps {
  activeWorkspace: Workspace | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onCreateProject: () => void;
  onBack: () => void;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  activeWorkspace,
  projects = [],
  onSelectProject,
  onCreateProject,
  onBack,
}) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All');

  const filteredProjects = projects.filter((p) => {
    if (query.trim() && !p.name.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    return true;
  });

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
        title="Projects"
        subtitle={`${activeWorkspace?.name || 'Workspace'} workspace`}
        rightActionText="+ New"
        onRightAction={onCreateProject}
        onBack={onBack}
      />

      <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search projects..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillRow}
        contentContainerStyle={styles.pillRowContent}
      >
        {(['All', 'Active', 'Completed'] as const).map((tab) => {
          const isActive = filter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? colors.red : colors.surface,
                  borderColor: isActive ? colors.red : colors.border,
                },
              ]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                {tab} ({filteredProjects.length})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredProjects.length > 0 ? (
        <View style={styles.list}>
          {filteredProjects.map((p, idx) => (
            <ProjectCard
              key={p.id}
              letter={p.name}
              name={p.name}
              meta={`${p.taskCount || 0} tasks · ${p.description || 'Active project'}`}
              progress={getProgress(p)}
              bg={getBgColor(idx)}
              onPress={() => onSelectProject(p)}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No projects found in this workspace.</Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.red }]} onPress={onCreateProject}>
            <Text style={styles.createBtnText}>+ Create Project</Text>
          </TouchableOpacity>
        </View>
      )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 11,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    padding: 0,
  },
  pillRow: {
    marginVertical: 13,
  },
  pillRowContent: {
    gap: 7,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 10,
  },
  list: {
    gap: 8,
  },
  emptyState: {
    padding: 30,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
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
