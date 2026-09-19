import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore, ToastType } from '../stores/toastStore';
import { useThemeStore } from '../stores/themeStore';

const toastConfig: Record<ToastType, { icon: string; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: '#10B981', bg: '#10B98115' },
  error: { icon: 'alert-circle', color: '#EF4444', bg: '#EF444415' },
  warning: { icon: 'warning', color: '#F59E0B', bg: '#F59E0B15' },
  info: { icon: 'information-circle', color: '#3B82F6', bg: '#3B82F615' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const { colors } = useThemeStore();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        return (
          <TouchableOpacity
            key={toast.id}
            style={[styles.toast, { backgroundColor: colors.bgSurface, borderColor: config.color }]}
            onPress={() => removeToast(toast.id)}
            activeOpacity={0.9}
          >
            <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon as any} size={18} color={config.color} />
            </View>
            <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={3}>
              {toast.message}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
