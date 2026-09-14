import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { Task } from '../types';

interface MyWorkScreenProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export const MyWorkScreen: React.FC<MyWorkScreenProps> = ({
  tasks,
  onSelectTask,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'All' | 'Assigned' | 'Overdue' | 'Done'>('All');
  const [selectedProject, setSelectedProject] = useState<string>('All');

  const uniqueProjects = React.useMemo(() => {
    const names = Array.from(new Set(tasks.map((t) => t.projectName).filter(Boolean))) as string[];
    return ['All', ...names];
  }, [tasks]);

  const now = new Date();
  
  const getFilteredTasks = () => {
    let base: Task[] = tasks;
    if (selectedProject !== 'All') {
      base = base.filter((t) => t.projectName?.toLowerCase() === selectedProject.toLowerCase());
    }

    const overdue = base.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const isDone = t.status?.toLowerCase().includes('done') || t.status?.toLowerCase().includes('complete');
      return due < now && !isDone;
    });

    const done = base.filter((t) => {
      return t.status?.toLowerCase().includes('done') || t.status?.toLowerCase().includes('complete');
    });

    const active = base.filter((t) => {
      return !t.status?.toLowerCase().includes('done') && !t.status?.toLowerCase().includes('complete');
    });

    switch (activeTab) {
      case 'Assigned':
        return active;
      case 'Overdue':
        return overdue;
      case 'Done':
        return done;
      case 'All':
      default:
        return base;
    }
  };

  const displayTasks = getFilteredTasks();

  const activeProjectTasks = selectedProject === 'All' ? tasks : tasks.filter((t) => t.projectName?.toLowerCase() === selectedProject.toLowerCase());
  const overdueCount = activeProjectTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !t.status?.toLowerCase().includes('done') && !t.status?.toLowerCase().includes('complete')).length;
  const doneCount = activeProjectTasks.filter((t) => t.status?.toLowerCase().includes('done') || t.status?.toLowerCase().includes('complete')).length;
  const activeCount = activeProjectTasks.length - doneCount;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header title="My Work" subtitle="Everything assigned to you" onSearch={() => {}} />

      {/* Project Selector Bar */}
      {uniqueProjects.length > 1 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Filter by Project ({uniqueProjects.length - 1} Available)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillRow}
            contentContainerStyle={styles.pillRowContent}
          >
            {uniqueProjects.map((proj) => {
              const isActive = selectedProject === proj;
              const count = proj === 'All' ? tasks.length : tasks.filter((t) => t.projectName?.toLowerCase() === proj.toLowerCase()).length;
              return (
                <TouchableOpacity
                  key={proj}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isActive ? colors.blue : colors.surface,
                      borderColor: isActive ? colors.blue : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedProject(proj)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                    📁 {proj === 'All' ? 'All Projects' : proj} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Status Selector Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillRow}
        contentContainerStyle={styles.pillRowContent}
      >
        {(['All', 'Assigned', 'Overdue', 'Done'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'All' ? activeProjectTasks.length : tab === 'Assigned' ? activeCount : tab === 'Overdue' ? overdueCount : doneCount;
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
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, { color: isActive ? '#ffffff' : colors.textMuted, fontWeight: isActive ? '700' : '600' }]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {selectedProject !== 'All' ? `📁 ${selectedProject} · ` : ''}{activeTab} Tasks <Text style={{ color: colors.textMuted }}>({displayTasks.length})</Text>
        </Text>
      </View>

      {displayTasks.length > 0 ? (
        <View style={styles.list}>
          {displayTasks.map((t) => (
            <TaskCard
              key={t.id}
              title={t.title}
              description={t.description}
              priority={(t.priority as any) || 'Medium'}
              dueDate={t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}
              assigneeName={t.assignee?.name || (t.assigneeId ? 'Assigned' : undefined)}
              status={t.status}
              isCompleted={t.isCompleted}
              projectName={t.projectName}
              onPress={() => onSelectTask(t)}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks found in this section.</Text>
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
  pillRow: {
    marginBottom: 15,
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
  sectionHeading: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
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
  },
  emptyText: {
    fontSize: 12,
  },
});
