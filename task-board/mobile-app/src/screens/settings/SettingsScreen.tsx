import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export default function SettingsScreen({ navigation }: any) {
  const { colors, theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  type MenuItem = { icon: string; label: string; onPress: () => void; trailing?: React.ReactNode; danger?: boolean };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: user?.name || 'Profile', onPress: () => {} },
        { icon: 'mail-outline', label: user?.email || 'Email', onPress: () => {} },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: theme === 'dark' ? 'moon-outline' : 'sunny-outline',
          label: `${theme === 'dark' ? 'Dark' : 'Light'} Mode`,
          onPress: toggleTheme,
          trailing: (
            <View style={[styles.toggle, { backgroundColor: colors.primary }]}>
              <View style={[styles.toggleDot, { transform: [{ translateX: theme === 'dark' ? 18 : 0 }] }]} />
            </View>
          ),
        },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { icon: 'people-outline', label: 'Members & Invites', onPress: () => navigation.navigate('Members') },
      ],
    },
    {
      title: 'Navigation',
      items: [
        { icon: 'pulse-outline', label: 'Activity Log', onPress: () => navigation.navigate('Activity') },
        { icon: 'calendar-outline', label: 'Calendar', onPress: () => navigation.navigate('Calendar') },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        { icon: 'log-out-outline', label: 'Logout', onPress: handleLogout, danger: true },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user && user.name ? user.name.charAt(0).toUpperCase() : '?')}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name}</Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email}</Text>
          </View>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title.toUpperCase()}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, index < section.items.length - 1 && { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}
                  onPress={item.onPress}
                >
                  <Ionicons name={item.icon as any} size={20} color={item.danger ? colors.danger : colors.textSecondary} />
                  <Text style={[styles.menuLabel, { color: item.danger ? colors.danger : colors.textPrimary }]}>
                    {item.label}
                  </Text>
                  {item.trailing || <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: colors.textMuted }]}>Task Board v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 14, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  profileEmail: { fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuLabel: { flex: 1, fontSize: 15 },
  toggle: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});
