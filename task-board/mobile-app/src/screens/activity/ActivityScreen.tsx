import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useActivityStore } from '../../stores/activityStore';
import { Activity } from '../../types';
import { formatDate } from '../../utils/dates';

export default function ActivityScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { activities, isLoading, fetchActivities } = useActivityStore();

  useEffect(() => {
    if (activeWorkspace) fetchActivities(activeWorkspace.id, undefined, true);
  }, [activeWorkspace]);

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return 'add-circle-outline';
    if (action.includes('update') || action.includes('edit')) return 'create-outline';
    if (action.includes('delete')) return 'trash-outline';
    if (action.includes('move')) return 'arrow-forward-outline';
    if (action.includes('comment')) return 'chatbubble-outline';
    if (action.includes('assign')) return 'person-add-outline';
    return 'pulse-outline';
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return colors.success;
    if (action.includes('delete')) return colors.danger;
    if (action.includes('move')) return colors.info;
    return colors.primary;
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const iconColor = getActionColor(item.action);
    return (
      <View style={[styles.activityItem, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={getActionIcon(item.action) as any} size={18} color={iconColor} />
        </View>
        <View style={styles.activityContent}>
          <Text style={[styles.activityDesc, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={[styles.activityTime, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivity}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => activeWorkspace && fetchActivities(activeWorkspace.id, undefined, true)} tintColor={colors.primary} />}
        onEndReached={() => activeWorkspace && fetchActivities(activeWorkspace.id)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pulse-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  listContent: { padding: 16 },
  activityItem: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  iconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  activityTime: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
