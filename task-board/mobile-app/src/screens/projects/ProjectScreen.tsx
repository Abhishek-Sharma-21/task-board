import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useProjectStore } from '../../stores/projectStore';
import { useBoardStore } from '../../stores/boardStore';
import { Board } from '../../types';
import { formatFullDate } from '../../utils/dates';

export default function ProjectScreen({ route, navigation }: any) {
  const { projectId } = route.params;
  const { colors } = useThemeStore();
  const { projects, updateProject, deleteProject } = useProjectStore();
  const { boards, fetchBoards, createBoard, setActiveBoard } = useBoardStore();
  const project = projects.find((p) => p.id === projectId);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project?.name || '');
  const [editDesc, setEditDesc] = useState(project?.description || '');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  useEffect(() => {
    if (projectId) fetchBoards(projectId);
  }, [projectId]);

  const handleSaveProject = async () => {
    if (!editName.trim()) return;
    await updateProject(projectId, { name: editName.trim(), description: editDesc.trim() });
    setIsEditing(false);
  };

  const handleDeleteProject = () => {
    Alert.alert('Delete Project', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProject(projectId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    await createBoard(projectId, newBoardName.trim());
    setNewBoardName('');
    setShowNewBoard(false);
  };

  const handleOpenBoard = (board: Board) => {
    setActiveBoard(board);
    navigation.navigate('Tabs', { screen: 'Board' });
  };

  if (!project) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Project not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{project.name}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('ProjectMembers', { projectId, projectName: project.name })}
        >
          <Ionicons name="people-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons name={isEditing ? 'close' : 'create-outline'} size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Project Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          {isEditing ? (
            <View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Project name"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProject}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.projectName, { color: colors.textPrimary }]}>{project.name}</Text>
              {project.description && (
                <Text style={[styles.projectDesc, { color: colors.textSecondary }]}>{project.description}</Text>
              )}
              <Text style={[styles.metaText, { color: colors.textMuted }]}>Created {formatFullDate(project.createdAt)}</Text>
            </View>
          )}
        </View>

        {/* Boards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Boards</Text>
            <TouchableOpacity onPress={() => setShowNewBoard(!showNewBoard)}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {showNewBoard && (
            <View style={[styles.newBoardRow, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary, flex: 1 }]}
                value={newBoardName}
                onChangeText={setNewBoardName}
                placeholder="Board name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={handleCreateBoard}>
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          )}

          {boards.map((board) => (
            <TouchableOpacity
              key={board.id}
              style={[styles.boardCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
              onPress={() => handleOpenBoard(board)}
            >
              <View style={[styles.boardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="grid" size={20} color={colors.primary} />
              </View>
              <View style={styles.boardInfo}>
                <Text style={[styles.boardName, { color: colors.textPrimary }]}>{board.name}</Text>
                {board.description && (
                  <Text style={[styles.boardDesc, { color: colors.textMuted }]} numberOfLines={1}>{board.description}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}

          {boards.length === 0 && !showNewBoard && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No boards yet. Create one to get started.</Text>
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={[styles.dangerBtn, { borderColor: colors.danger }]}
            onPress={handleDeleteProject}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.dangerText, { color: colors.danger }]}>Delete Project</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  headerBtn: { padding: 4, marginRight: 4 },
  content: { padding: 16 },
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  projectName: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  projectDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  metaText: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  newBoardRow: { flexDirection: 'row', gap: 8, marginBottom: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  createBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, justifyContent: 'center' },
  createBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  boardCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 12 },
  boardIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  boardInfo: { flex: 1 },
  boardName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  boardDesc: { fontSize: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', padding: 20 },
  dangerZone: { marginTop: 20 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, borderWidth: 1, gap: 8 },
  dangerText: { fontSize: 14, fontWeight: '500' },
  errorText: { fontSize: 15, textAlign: 'center', paddingTop: 80 },
});
