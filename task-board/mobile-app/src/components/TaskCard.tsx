import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Badge } from './Badge';
import { Avatar } from './Avatar';

interface TaskCardProps {
  title: string;
  description?: string | null;
  priority?: 'Low' | 'Medium' | 'High' | 'Overdue';
  dueDate?: string | null;
  assigneeName?: string | null;
  status?: string | null;
  isCompleted?: boolean;
  projectName?: string | null;
  onPress?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  priority = 'Medium',
  dueDate,
  assigneeName,
  status,
  isCompleted,
  projectName,
  onPress,
}) => {
  const { colors } = useTheme();

  const isDone =
    isCompleted ||
    status?.toLowerCase().includes('done') ||
    status?.toLowerCase().includes('complete');

  const getBorderColor = () => {
    if (isDone) return colors.green;
    switch (priority) {
      case 'High':
      case 'Overdue':
        return colors.red;
      case 'Medium':
        return colors.yellow;
      case 'Low':
        return colors.green;
      default:
        return colors.blue;
    }
  };

  const getBadgeType = () => {
    switch (priority) {
      case 'High':
      case 'Overdue':
        return 'red';
      case 'Medium':
        return 'yellow';
      case 'Low':
        return 'green';
      default:
        return 'blue';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDone ? colors.green : colors.border,
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      {projectName ? (
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.blue, letterSpacing: 0.5 }}>
            📁 {projectName.toUpperCase()}
          </Text>
        </View>
      ) : null}

      <View style={styles.top}>
        <Text style={[styles.title, { color: isDone ? colors.textMuted : colors.text }, isDone && { textDecorationLine: 'line-through' }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {isDone && <Badge label="✓ DONE" type="green" />}
          <Badge label={priority} type={getBadgeType()} />
        </View>
      </View>

      {description ? (
        <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={2}>
          {description}
        </Text>
      ) : null}

      <View style={styles.bottom}>
        <View style={styles.info}>
          {dueDate ? <Text style={[styles.infoText, { color: colors.textMuted }]}>◷ {dueDate}</Text> : null}
          {dueDate && assigneeName ? <Text style={[styles.infoText, { color: colors.textMuted }]}>•</Text> : null}
          {assigneeName ? <Text style={[styles.infoText, { color: colors.textMuted }]}>{assigneeName}</Text> : null}
        </View>

        {assigneeName && <Avatar letter={assigneeName} size="small" />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  desc: {
    fontSize: 10,
    marginTop: 5,
    lineHeight: 14,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 10,
  },
});
