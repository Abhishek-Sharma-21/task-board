import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useNotificationStore } from '../stores/notificationStore';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MyWorkScreen from '../screens/mywork/MyWorkScreen';
import BoardScreen from '../screens/boards/BoardScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import ActivityScreen from '../screens/activity/ActivityScreen';
import ProjectScreen from '../screens/projects/ProjectScreen';
import MembersScreen from '../screens/settings/MembersScreen';
import ProjectMembersScreen from '../screens/projects/ProjectMembersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  const { colors } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'MyWork') iconName = focused ? 'briefcase' : 'briefcase-outline';
          else if (route.name === 'Board') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderDefault,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyWork" component={MyWorkScreen} options={{ tabBarLabel: 'My Work' }} />
      <Tab.Screen name="Board" component={BoardScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
        }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      <RootStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <RootStack.Screen name="Calendar" component={CalendarScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <RootStack.Screen name="Activity" component={ActivityScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <RootStack.Screen name="Project" component={ProjectScreen} options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="Members" component={MembersScreen} options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="ProjectMembers" component={ProjectMembersScreen} options={{ animation: 'slide_from_right' }} />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0F1C' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
