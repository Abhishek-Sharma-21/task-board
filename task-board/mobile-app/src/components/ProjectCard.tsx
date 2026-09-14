import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProjectCardProps {
  letter: string;
  name: string;
  meta: string;
  progress: number;
  bg?: string;
  onPress?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  letter,
  name,
  meta,
  progress,
  bg,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.icon, { backgroundColor: bg || colors.red }]}>
        <Text style={styles.iconText}>{letter.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.main}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
          {meta}
        </Text>

        <View style={[styles.progressTrack, { backgroundColor: colors.surface3 }]}>
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: colors.red }]} />
        </View>

        <View style={styles.progressLabel}>
          <Text style={[styles.labelText, { color: colors.textMuted }]}>{progress}% complete</Text>
          <Text style={[styles.arrowText, { color: colors.redLight }]}>View →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  iconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  main: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  meta: {
    fontSize: 10,
  },
  progressTrack: {
    height: 5,
    borderRadius: 99,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  labelText: {
    fontSize: 9,
  },
  arrowText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
