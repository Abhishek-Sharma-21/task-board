import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Project, Workspace } from '../types';

interface CreateProjectScreenProps {
  activeWorkspace: Workspace | null;
  onProjectCreated: (newProject: Project) => void;
  onBack: () => void;
}

export const CreateProjectScreen: React.FC<CreateProjectScreenProps> = ({
  activeWorkspace,
  onProjectCreated,
  onBack,
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg('Project name is required');
      return;
    }
    if (!activeWorkspace?.id) {
      setErrorMsg('No active workspace selected');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await api.post(`/workspaces/${activeWorkspace.id}/projects`, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (res.data?.data) {
        const newProj = res.data.data;
        // Auto-provision initial board with default columns for this project
        await api.post(`/projects/${newProj.id}/boards`, {
          name: 'Main Board',
        }).catch(() => {});
        onProjectCreated(newProj);
      }
    } catch (err: any) {
      console.log('[mobile-app] Project creation error:', err);
      const msg = err.response?.data?.message || 'Failed to create project. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.screenBack}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create New Project</Text>
      </View>

      {errorMsg && (
        <View style={[styles.errorBox, { backgroundColor: colors.redBg, borderColor: colors.red }]}>
          <Text style={[styles.errorText, { color: colors.redLight }]}>⚠️ {errorMsg}</Text>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Workspace</Text>
        <View style={[styles.readonlyBox, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
          <Text style={[styles.readonlyText, { color: colors.textMuted }]}>{activeWorkspace?.name || 'Active Workspace'}</Text>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Project Name *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="e.g. Website Redesign, Mobile App v2"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(txt) => {
            setName(txt);
            if (errorMsg) setErrorMsg(null);
          }}
          editable={!isSubmitting}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Add project overview and goals..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          editable={!isSubmitting}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.red }, (!name.trim() || isSubmitting) && styles.disabledBtn]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={!name.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.primaryBtnText}>Create Project</Text>
        )}
      </TouchableOpacity>
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
    marginBottom: 21,
  },
  backText: {
    fontSize: 27,
    lineHeight: 27,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  errorBox: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
  },
  readonlyBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  readonlyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 11,
    padding: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
