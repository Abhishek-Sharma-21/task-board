import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';

interface NotificationsScreenProps {
  notifications?: any[];
  onRefresh?: () => void;
  onSelectNotification?: (notif: any) => void;
  onBack?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications = [],
  onRefresh,
  onSelectNotification,
  onBack,
}) => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
  const [refreshing, setRefreshing] = useState(false);

  const displayNotifs = notifications.filter((n) => {
    const isUnread = n.read === false || n.isRead === false;
    if (filter === 'Unread') return isUnread;
    return true;
  });

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.red} />
      }
    >
      <Header
        title="Notifications"
        subtitle="Stay updated with your workspace"
        onBack={onBack}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillRow}
        contentContainerStyle={styles.pillRowContent}
      >
        {(['All', 'Unread'] as const).map((tab) => {
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
                {tab} ({tab === 'All' ? notifications.length : notifications.filter((n) => !n.isRead).length})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {displayNotifs.length > 0 ? (
        <View style={styles.list}>
          {displayNotifs.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[
                styles.card,
                {
                  backgroundColor: !n.isRead ? colors.redBg : colors.surface,
                  borderColor: !n.isRead ? colors.red : colors.border,
                  borderLeftWidth: !n.isRead ? 3 : 1,
                  borderLeftColor: !n.isRead ? colors.red : colors.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => onSelectNotification && onSelectNotification(n)}
            >
              <Avatar letter={n.actor?.name || 'S'} isRed={!n.isRead} />

              <View style={styles.cardContent}>
                <Text style={[styles.titleText, { color: colors.text }]}>
                  <Text style={[styles.boldText, { color: colors.text }]}>{n.title}</Text>{'\n'}
                  <Text style={{ color: colors.textMuted }}>{n.message}</Text>
                </Text>
                <Text style={[styles.timeText, { color: colors.textMuted }]}>
                  {n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : 'Recently'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>You're all caught up! No notifications.</Text>
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
  list: {
    gap: 9,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
  },
  titleText: {
    fontSize: 11,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 9,
    marginTop: 5,
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
