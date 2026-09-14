import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/Avatar';
import { ActivityItem } from '../types';

interface TaskActivityScreenProps {
  activities?: ActivityItem[];
  onBack: () => void;
}

export const TaskActivityScreen: React.FC<TaskActivityScreenProps> = ({
  activities = [],
  onBack,
}) => {
  const { colors } = useTheme();

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Task Activity</Text>
      </View>

      {activities.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {activities.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.memberRow,
                { borderBottomColor: colors.border },
                idx === activities.length - 1 && styles.lastRow,
              ]}
            >
              <Avatar
                letter={item.user?.name || 'U'}
                isRed
              />

              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.action}</Text>
                <Text style={[styles.details, { color: colors.textMuted }]}>{item.details}</Text>
              </View>

              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity logged for this task yet.</Text>
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
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    fontSize: 10,
    marginTop: 3,
  },
  timeText: {
    fontSize: 10,
  },
  emptyState: {
    padding: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 12,
  },
});
