import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

export function Spinner({ size = 'large', color }: { size?: 'small' | 'large'; color?: string }) {
  const { colors } = useThemeStore();
  return (
    <View style={styles.center}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useThemeStore();
  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>{icon}</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction && (
        <React.Fragment>
          <View style={{ height: 16 }} />
          <View style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText} onPress={onAction}>{actionLabel}</Text>
          </View>
        </React.Fragment>
      )}
    </View>
  );
}

export function PriorityBadge({ priority, colors }: { priority: string; colors: { text: string; bg: string } }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{priority.toUpperCase()}</Text>
    </View>
  );
}

export function Avatar({ name, size = 28, colors }: { name: string; size?: number; colors: { primary: string; textPrimary: string; bgSurface: string } }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary + '30',
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  emptyMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  button: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  avatar: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '600' },
});
