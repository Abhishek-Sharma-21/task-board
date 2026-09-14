import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { MobileScreen } from '../types';

interface BottomNavBarProps {
  currentScreen: MobileScreen;
  onNavigate: (screen: MobileScreen) => void;
  onFabPress: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
  onFabPress,
}) => {
  const { colors } = useTheme();

  const hiddenScreens: MobileScreen[] = [
    'splash',
    'login',
    'register',
    'create-task',
    'create-project',
    'task-details',
    'chat',
    'activity',
    'members',
    'settings',
  ];

  const hideFabScreens: MobileScreen[] = [...hiddenScreens, 'profile'];

  if (hiddenScreens.includes(currentScreen)) {
    return null;
  }

  const showFab = !hideFabScreens.includes(currentScreen);

  return (
    <View style={styles.wrapper}>
      {showFab && (
        <TouchableOpacity
          style={[styles.fab, { borderColor: colors.bg, backgroundColor: colors.red }]}
          activeOpacity={0.85}
          onPress={onFabPress}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.navBar, { backgroundColor: colors.navBg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('home')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navIcon,
              { color: currentScreen === 'home' ? colors.redLight : colors.textMuted },
            ]}
          >
            ⌂
          </Text>
          <Text
            style={[
              styles.navLabel,
              { color: currentScreen === 'home' ? colors.redLight : colors.textMuted, fontWeight: currentScreen === 'home' ? '700' : '500' },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('mywork')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navIcon,
              { color: currentScreen === 'mywork' ? colors.redLight : colors.textMuted },
            ]}
          >
            ✓
          </Text>
          <Text
            style={[
              styles.navLabel,
              { color: currentScreen === 'mywork' ? colors.redLight : colors.textMuted, fontWeight: currentScreen === 'mywork' ? '700' : '500' },
            ]}
          >
            My Work
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('calendar')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navIcon,
              { color: currentScreen === 'calendar' ? colors.redLight : colors.textMuted },
            ]}
          >
            📅
          </Text>
          <Text
            style={[
              styles.navLabel,
              { color: currentScreen === 'calendar' ? colors.redLight : colors.textMuted, fontWeight: currentScreen === 'calendar' ? '700' : '500' },
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('workspaces')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navIcon,
              { color: currentScreen === 'workspaces' ? colors.redLight : colors.textMuted },
            ]}
          >
            🏢
          </Text>
          <Text
            style={[
              styles.navLabel,
              { color: currentScreen === 'workspaces' ? colors.redLight : colors.textMuted, fontWeight: currentScreen === 'workspaces' ? '700' : '500' },
            ]}
          >
            Workspaces
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('settings')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navIcon,
              { color: currentScreen === 'settings' ? colors.redLight : colors.textMuted },
            ]}
          >
            ⚙
          </Text>
          <Text
            style={[
              styles.navLabel,
              { color: currentScreen === 'settings' ? colors.redLight : colors.textMuted, fontWeight: currentScreen === 'settings' ? '700' : '500' },
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  fab: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    elevation: 8,
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 25,
    lineHeight: 25,
    fontWeight: '300',
  },
  navBar: {
    height: 65,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  navIcon: {
    fontSize: 17,
  },
  navLabel: {
    fontSize: 9,
  },
});
