import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './Avatar';

interface HeaderProps {
  title: string;
  subtitle?: string;
  workspaceName?: string;
  userName?: string;
  unreadCount?: number;
  onBack?: () => void;
  onSearch?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onWorkspaceClick?: () => void;
  rightActionText?: string;
  onRightAction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  workspaceName,
  userName,
  unreadCount,
  onBack,
  onSearch,
  onNotificationClick,
  onProfileClick,
  onWorkspaceClick,
  rightActionText,
  onRightAction,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
        )}

        {workspaceName && (
          <TouchableOpacity onPress={onWorkspaceClick} activeOpacity={0.8} style={[styles.wsIcon, { backgroundColor: colors.red }]}>
            <Text style={styles.wsIconText}>{workspaceName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <TouchableOpacity
            disabled={!onWorkspaceClick}
            onPress={onWorkspaceClick}
            activeOpacity={0.8}
            style={styles.titleRow}
          >
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {workspaceName && <Text style={[styles.chevron, { color: colors.textMuted }]}>⌄</Text>}
          </TouchableOpacity>

          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.headerRight}>
        {onSearch && (
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={onSearch}
            activeOpacity={0.7}
          >
            <Text style={[styles.iconBtnText, { color: colors.text }]}>⌕</Text>
          </TouchableOpacity>
        )}

        {onNotificationClick && (
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={onNotificationClick}
            activeOpacity={0.7}
          >
            <Text style={[styles.iconBtnText, { color: colors.text }]}>🔔</Text>
            {unreadCount !== undefined && unreadCount > 0 && (
              <View style={[styles.badgeOverlay, { backgroundColor: colors.red }]}>
                <Text style={styles.badgeOverlayText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {userName && (
          <TouchableOpacity onPress={onProfileClick} activeOpacity={0.8}>
            <Avatar letter={userName} isRed />
          </TouchableOpacity>
        )}

        {rightActionText && (
          <TouchableOpacity
            style={[styles.secBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={onRightAction}
            activeOpacity={0.8}
          >
            <Text style={[styles.secBtnText, { color: colors.text }]}>{rightActionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    paddingRight: 6,
  },
  backText: {
    fontSize: 27,
    lineHeight: 27,
  },
  wsIcon: {
    width: 33,
    height: 33,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  wsIconText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 3,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: {
    fontSize: 16,
  },
  secBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  secBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeOverlayText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
});
