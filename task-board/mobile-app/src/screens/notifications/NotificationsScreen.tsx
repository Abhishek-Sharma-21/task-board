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
import { useNotificationStore } from '../../stores/notificationStore';
import { Notification } from '../../types';
import { formatDate } from '../../utils/dates';

export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.link) {
      if (notification.link.startsWith('/tasks/')) {
        const taskId = notification.link.split('/tasks/')[1]?.split('?')[0];
        if (taskId) navigation.navigate('TaskDetail', { taskId });
      } else if (notification.link.startsWith('/projects/')) {
        const projectId = notification.link.split('/projects/')[1]?.split('/')[0];
        if (projectId) navigation.navigate('Project', { projectId });
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task.assigned': return 'person-add-outline';
      case 'task.moved': return 'arrow-forward-outline';
      case 'task.comment': return 'chatbubble-outline';
      case 'task.mentioned': return 'at-outline';
      default: return 'notifications-outline';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }, !item.read && { backgroundColor: colors.primaryLight }]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={getNotificationIcon(item.type) as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchNotifications} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No notifications</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  markAll: { fontSize: 13, fontWeight: '500' },
  listContent: { padding: 12 },
  card: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 12 },
  iconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  message: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
