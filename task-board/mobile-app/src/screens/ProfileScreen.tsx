import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { User } from '../types';

interface ProfileScreenProps {
  user: User | null;
  onNavigateSettings: () => void;
  onNavigateActivity: () => void;
  onSignOut: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onNavigateSettings,
  onNavigateActivity,
  onSignOut,
}) => {
  const { colors, themeMode } = useTheme();
  const userName = user?.name || 'Workspace User';
  const userEmail = user?.email || 'user@example.com';

  const themeLabel = themeMode === 'light' ? 'Light' : themeMode === 'dark' ? 'Dark' : 'System Default';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="Profile"
        subtitle="Your account"
        rightActionText="⚙"
        onRightAction={onNavigateSettings}
      />

      <View style={styles.profileCard}>
        <Avatar letter={userName} size="large" isRed />
        <Text style={[styles.name, { color: colors.text }]}>{userName}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{userEmail}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} activeOpacity={0.7}>
          <View style={styles.iconBox}>
            <Text style={[styles.iconText, { color: colors.red }]}>✎</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.rowName, { color: colors.text }]}>Edit Profile</Text>
            <Text style={[styles.desc, { color: colors.textMuted }]}>Update name and profile information</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={onNavigateActivity}
          activeOpacity={0.7}
        >
          <View style={styles.iconBox}>
            <Text style={[styles.iconText, { color: colors.red }]}>☷</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.rowName, { color: colors.text }]}>Your Activity</Text>
            <Text style={[styles.desc, { color: colors.textMuted }]}>View your recent activity</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={onNavigateSettings}
          activeOpacity={0.7}
        >
          <View style={styles.iconBox}>
            <Text style={[styles.iconText, { color: colors.red }]}>◐</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.rowName, { color: colors.text }]}>Theme</Text>
            <Text style={[styles.desc, { color: colors.textMuted }]}>{themeLabel}</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowLast} activeOpacity={0.7}>
          <View style={styles.iconBox}>
            <Text style={[styles.iconText, { color: colors.red }]}>?</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.rowName, { color: colors.text }]}>Help & Support</Text>
            <Text style={[styles.desc, { color: colors.textMuted }]}>Contact support</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={onSignOut}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 25,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 12,
  },
  email: {
    fontSize: 11,
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 10,
  },
  rowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 10,
  },
  iconBox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 11,
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  rowName: {
    fontSize: 12,
    fontWeight: '700',
  },
  desc: {
    fontSize: 10,
    marginTop: 3,
  },
  chevron: {
    fontSize: 18,
  },
  signOutBtn: {
    marginTop: 18,
    borderRadius: 11,
    padding: 13,
    backgroundColor: '#3a1718',
    borderColor: '#632424',
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    color: '#ff7773',
    fontSize: 12,
    fontWeight: '800',
  },
});
