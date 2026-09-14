import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { api } from './src/services/api';
import { storage } from './src/services/storage';
import { connectSocket, getSocket, disconnectSocket } from './src/services/socket';
import { BottomNavBar } from './src/components/BottomNavBar';
import { MobileScreen, User, Workspace, WorkspaceMember, Project, Board, Task, Column } from './src/types';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MyWorkScreen } from './src/screens/MyWorkScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { WorkspacesScreen } from './src/screens/WorkspacesScreen';
import { ProjectsScreen } from './src/screens/ProjectsScreen';
import { CreateProjectScreen } from './src/screens/CreateProjectScreen';
import { BoardScreen } from './src/screens/BoardScreen';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { TaskDetailsScreen } from './src/screens/TaskDetailsScreen';
import { TaskChatScreen } from './src/screens/TaskChatScreen';
import { TaskActivityScreen } from './src/screens/TaskActivityScreen';
import { WorkspaceMembersScreen } from './src/screens/WorkspaceMembersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

function MainApp() {
  const { colors, isDark } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('splash');
  const [screenStack, setScreenStack] = useState<MobileScreen[]>(['splash']);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Live analytics state
  const [analytics, setAnalytics] = useState<{
    totalTasks: number;
    assignedToUserTasks: number;
    overdueTasks: number;
    completedTasks: number;
  }>({
    totalTasks: 0,
    assignedToUserTasks: 0,
    overdueTasks: 0,
    completedTasks: 0,
  });

  // Board state
  const [projectBoards, setProjectBoards] = useState<Board[]>([]);
  const [boardColumns, setBoardColumns] = useState<Column[]>([]);
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  // My Work tasks & Notifications
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Navigation helpers
  const navigateTo = (screen: MobileScreen) => {
    setScreenStack((prev) => [...prev, screen]);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    setScreenStack((prev) => {
      if (prev.length <= 1) {
        setCurrentScreen('home');
        return ['home'];
      }
      const nextStack = prev.slice(0, -1);
      setCurrentScreen(nextStack[nextStack.length - 1]);
      return nextStack;
    });
  };

  // Hardware Back Button Handler for Android
  useEffect(() => {
    const onBackPress = () => {
      if (['splash', 'login', 'home'].includes(currentScreen)) {
        return false; // Exit app or default behavior
      }
      goBack();
      return true; // Handled
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [currentScreen]);

  // Check auth session on startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          const res = await api.get('/auth/me');
          if (res.data?.data?.user) {
            setUser(res.data.data.user);
            await fetchWorkspaces();
            await fetchNotifications();
          }
        }
      } catch (e) {
        console.log('[mobile-app] Session check completed');
      }
    };
    initAuth();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch (e) {
      console.log('[mobile-app] Error fetching notifications', e);
    }
  };

  const selectAndActivateWorkspace = async (ws: Workspace) => {
    setActiveWorkspace(ws);
    await storage.setLastWorkspaceId(ws.id);
    await fetchProjects(ws.id);
    await fetchWorkspaceAnalytics(ws.id);
    await fetchWorkspaceMembers(ws.id);
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces');
      if (res.data?.data) {
        const wsList: Workspace[] = res.data.data;
        setWorkspaces(wsList);
        if (wsList.length > 0) {
          const savedWsId = await storage.getLastWorkspaceId();
          const targetWs = (savedWsId && wsList.find((w) => w.id === savedWsId)) || wsList[0];
          await selectAndActivateWorkspace(targetWs);
        }
      }
    } catch (e) {
      console.log('[mobile-app] Error fetching workspaces', e);
    }
  };

  const fetchWorkspaceMembers = async (workspaceId: string) => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      if (res.data?.data) {
        setWorkspaceMembers(res.data.data);
      }
    } catch (e) {
      console.log('[mobile-app] Error fetching workspace members', e);
    }
  };

  const fetchWorkspaceAnalytics = async (workspaceId: string) => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/analytics`);
      if (res.data?.data) {
        const data = res.data.data;
        setAnalytics({
          totalTasks: data.totalTasks || 0,
          assignedToUserTasks: data.assignedToUserTasks || 0,
          overdueTasks: data.overdueTasks || 0,
          completedTasks: data.completedTasks || 0,
        });
      }
    } catch (e) {
      console.log('[mobile-app] Error fetching analytics', e);
    }
  };

  const fetchProjects = async (workspaceId: string) => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/projects`);
      if (res.data?.data) {
        setProjects(res.data.data);
      }
    } catch (e) {
      console.log('[mobile-app] Error fetching projects', e);
    }
  };

  const fetchBoardData = async (project: Project, targetBoardId?: string) => {
    try {
      let boardsRes = await api.get(`/projects/${project.id}/boards`);
      let boards: Board[] = boardsRes.data?.data || [];

      // Auto-provision default board if no boards exist yet
      if (boards.length === 0) {
        const createRes = await api.post(`/projects/${project.id}/boards`, { name: 'Main Board' });
        if (createRes.data?.data) {
          boards = [createRes.data.data];
        }
      }

      setProjectBoards(boards);

      if (boards.length > 0) {
        const board = targetBoardId
          ? boards.find((b) => b.id === targetBoardId) || boards[0]
          : boards[0];

        setActiveBoardId(board.id);

        const colsRes = await api.get(`/boards/${board.id}/columns`);
        if (colsRes.data?.data) {
          setBoardColumns(colsRes.data.data);
        }

        const tasksRes = await api.get(`/boards/${board.id}/tasks`);
        if (tasksRes.data?.data) {
          setBoardTasks(tasksRes.data.data);
          setMyTasks(tasksRes.data.data);
        }
      }
    } catch (e) {
      console.log('[mobile-app] Error fetching board data', e);
    }
  };

  // Socket.IO real-time updates
  useEffect(() => {
    if (!user) return;
    connectSocket();
    const socket = getSocket();

    if (activeBoardId) {
      socket.emit('joinBoard', { boardId: activeBoardId, name: user.name || 'User' });
    }

    const handleTaskUpsert = (task: any) => {
      setBoardTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (exists) {
          return prev.map((t) => (t.id === task.id ? { ...t, ...task } : t));
        }
        return [task, ...prev];
      });
      setMyTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (exists) {
          return prev.map((t) => (t.id === task.id ? { ...t, ...task } : t));
        }
        return [task, ...prev];
      });
      if (activeWorkspace) fetchWorkspaceAnalytics(activeWorkspace.id);
    };

    const handleTaskDeleted = (data: { id: string }) => {
      setBoardTasks((prev) => prev.filter((t) => t.id !== data.id));
      setMyTasks((prev) => prev.filter((t) => t.id !== data.id));
      if (activeWorkspace) fetchWorkspaceAnalytics(activeWorkspace.id);
    };

    const handleNewNotification = (newNotif: any) => {
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
    };

    socket.on('task:created', handleTaskUpsert);
    socket.on('task:updated', handleTaskUpsert);
    socket.on('task:moved', handleTaskUpsert);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('notification:new', handleNewNotification);

    return () => {
      if (activeBoardId) {
        socket.emit('leaveBoard', { boardId: activeBoardId });
      }
      socket.off('task:created', handleTaskUpsert);
      socket.off('task:updated', handleTaskUpsert);
      socket.off('task:moved', handleTaskUpsert);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('notification:new', handleNewNotification);
    };
  }, [user, activeBoardId, activeWorkspace]);

  const handleLogin = async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, password: pass });
    const { user: loggedUser, accessToken } = res.data.data;
    await storage.setToken(accessToken);
    setUser(loggedUser);
    await fetchWorkspaces();
    navigateTo('home');
  };

  const handleRegister = async (name: string, email: string, pass: string) => {
    const res = await api.post('/auth/register', { name, email, password: pass });
    const { user: registeredUser, accessToken } = res.data.data;
    await storage.setToken(accessToken);
    setUser(registeredUser);
    await fetchWorkspaces();
    navigateTo('home');
  };

  const handleSignOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    await storage.removeToken();
    disconnectSocket();
    setUser(null);
    navigateTo('login');
  };

  const screensList: { id: MobileScreen; label: string }[] = [
    { id: 'splash', label: 'Splash' },
    { id: 'login', label: 'Login' },
    { id: 'register', label: 'Register' },
    { id: 'home', label: 'Home' },
    { id: 'mywork', label: 'My Work' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'workspaces', label: 'Workspaces' },
    { id: 'projects', label: 'Projects' },
    { id: 'create-project', label: 'Create Project' },
    { id: 'board', label: 'Board' },
    { id: 'create-task', label: 'Create Task' },
    { id: 'task-details', label: 'Task Details' },
    { id: 'chat', label: 'Task Chat' },
    { id: 'activity', label: 'Activity' },
    { id: 'members', label: 'Members' },
    { id: 'settings', label: 'Settings' },
    { id: 'profile', label: 'Profile' },
  ];

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <SplashScreen
            onFinish={() => navigateTo(user ? 'home' : 'login')}
          />
        );
      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            onNavigateRegister={() => navigateTo('register')}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onRegister={handleRegister}
            onNavigateLogin={() => navigateTo('login')}
          />
        );
      case 'home':
        {
          const unreadNotifCount = notifications.filter((n) => !n.isRead && !n.read).length;
          return (
            <HomeScreen
              user={user}
              activeWorkspace={activeWorkspace}
              projects={projects}
              totalTaskCount={analytics.totalTasks}
              assignedTaskCount={analytics.assignedToUserTasks}
              overdueTaskCount={analytics.overdueTasks}
              unreadCount={unreadNotifCount}
              onNavigateProjects={() => navigateTo('projects')}
              onNavigateWorkspaces={() => navigateTo('workspaces')}
              onNavigateProfile={() => navigateTo('settings')}
              onNavigateNotifications={() => navigateTo('notifications')}
              onSelectProject={(p) => {
                setActiveProject(p);
                fetchBoardData(p);
                navigateTo('board');
              }}
            />
          );
        }
      case 'mywork':
        return (
          <MyWorkScreen
            tasks={myTasks}
            onSelectTask={(t) => {
              setSelectedTask(t);
              navigateTo('task-details');
            }}
          />
        );
      case 'calendar':
        return (
          <CalendarScreen
            tasks={myTasks}
            onRefresh={() => {
              if (activeWorkspace) fetchWorkspaceAnalytics(activeWorkspace.id);
              if (activeProject) fetchBoardData(activeProject);
            }}
            onSelectTask={(t) => {
              setSelectedTask(t);
              navigateTo('task-details');
            }}
          />
        );
      case 'notifications':
        return (
          <NotificationsScreen
            notifications={notifications}
            onRefresh={fetchNotifications}
            onSelectNotification={() => navigateTo('task-details')}
            onBack={goBack}
          />
        );
      case 'workspaces':
        return (
          <WorkspacesScreen
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={async (ws) => {
              await selectAndActivateWorkspace(ws);
              navigateTo('projects');
            }}
            onWorkspaceCreated={async (newWs) => {
              setWorkspaces((prev) => [newWs, ...prev]);
              await selectAndActivateWorkspace(newWs);
              navigateTo('projects');
            }}
            onInviteMembers={() => navigateTo('members')}
            onBack={goBack}
          />
        );
      case 'projects':
        return (
          <ProjectsScreen
            activeWorkspace={activeWorkspace}
            projects={projects}
            onSelectProject={(p) => {
              setActiveProject(p);
              fetchBoardData(p);
              navigateTo('board');
            }}
            onCreateProject={() => navigateTo('create-project')}
            onBack={goBack}
          />
        );
      case 'create-project':
        return (
          <CreateProjectScreen
            activeWorkspace={activeWorkspace}
            onProjectCreated={(newProject) => {
              setProjects((prev) => [...prev, newProject]);
              setActiveProject(newProject);
              fetchBoardData(newProject);
              navigateTo('board');
            }}
            onBack={goBack}
          />
        );
      case 'board':
        return (
          <BoardScreen
            project={activeProject}
            workspaceMembers={workspaceMembers}
            boards={projectBoards}
            activeBoardId={activeBoardId}
            columns={boardColumns}
            tasks={boardTasks}
            onSelectBoard={(bId) => {
              if (activeProject) fetchBoardData(activeProject, bId);
            }}
            onSelectTask={(t) => {
              setSelectedTask(t);
              navigateTo('task-details');
            }}
            onCreateTask={() => navigateTo('create-task')}
            onBack={() => navigateTo('projects')}
          />
        );
      case 'create-task':
        return (
          <CreateTaskScreen
            workspaceId={activeWorkspace?.id}
            boardId={activeBoardId}
            columns={boardColumns}
            members={workspaceMembers}
            onTaskCreated={() => {
              if (activeProject) fetchBoardData(activeProject);
              if (activeWorkspace) fetchWorkspaceAnalytics(activeWorkspace.id);
              navigateTo('board');
            }}
            onBack={goBack}
          />
        );
      case 'task-details':
        return (
          <TaskDetailsScreen
            task={selectedTask}
            columns={boardColumns}
            onOpenChat={() => navigateTo('chat')}
            onViewActivity={() => navigateTo('activity')}
            onTaskUpdated={(updated) => {
              setSelectedTask(updated);
              setBoardTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
              setMyTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
              if (activeWorkspace) fetchWorkspaceAnalytics(activeWorkspace.id);
            }}
            onBack={goBack}
          />
        );
      case 'chat':
        return (
          <TaskChatScreen
            task={selectedTask}
            currentUser={user}
            onBack={goBack}
          />
        );
      case 'activity':
        return <TaskActivityScreen onBack={goBack} />;
      case 'members':
        return (
          <WorkspaceMembersScreen
            workspaceId={activeWorkspace?.id}
            workspaceName={activeWorkspace?.name}
            members={workspaceMembers}
            onRefresh={() => {
              if (activeWorkspace) fetchWorkspaceMembers(activeWorkspace.id);
            }}
            onMemberInvited={() => {
              if (activeWorkspace) fetchWorkspaceMembers(activeWorkspace.id);
            }}
            onBack={goBack}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            user={user}
            workspaceId={activeWorkspace?.id}
            onNavigateWorkspaces={() => navigateTo('workspaces')}
            onNavigateMembers={() => navigateTo('members')}
            onNavigateNotifications={() => navigateTo('notifications')}
            onSignOut={handleSignOut}
            onBack={goBack}
          />
        );
      case 'profile':
        return (
          <SettingsScreen
            user={user}
            workspaceId={activeWorkspace?.id}
            onNavigateWorkspaces={() => navigateTo('workspaces')}
            onNavigateMembers={() => navigateTo('members')}
            onNavigateNotifications={() => navigateTo('notifications')}
            onSignOut={handleSignOut}
            onBack={goBack}
          />
        );
      default:
        return (
          <HomeScreen
            user={user}
            activeWorkspace={activeWorkspace}
            projects={projects}
            totalTaskCount={analytics.totalTasks}
            assignedTaskCount={analytics.assignedToUserTasks}
            overdueTaskCount={analytics.overdueTasks}
            onNavigateProjects={() => navigateTo('projects')}
            onNavigateWorkspaces={() => navigateTo('workspaces')}
            onNavigateProfile={() => navigateTo('profile')}
            onNavigateNotifications={() => navigateTo('notifications')}
            onSelectProject={(p) => {
              setActiveProject(p);
              fetchBoardData(p);
              navigateTo('board');
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.outerContainer, { backgroundColor: isDark ? '#050506' : '#e2e8f0' }]}>
      {/* Web Screen Switcher Header Bar */}
      {Platform.OS === 'web' && (
        <View style={styles.previewHeader}>
          <View style={styles.previewHeadingRow}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>TaskBoard Mobile App Preview</Text>
            <Text style={[styles.previewSub, { color: colors.textMuted }]}>Connected to Backend Server</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.screenSelector}
            contentContainerStyle={styles.screenSelectorContent}
          >
            {screensList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.selectorBtn,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  currentScreen === item.id && { backgroundColor: colors.red, borderColor: colors.red },
                ]}
                onPress={() => navigateTo(item.id)}
              >
                <Text
                  style={[
                    styles.selectorBtnText,
                    { color: colors.textMuted },
                    currentScreen === item.id && styles.selectorBtnTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Phone Screen Frame Container */}
      <View
        style={[
          styles.phoneFrame,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.phoneScreen, { backgroundColor: colors.bg }]}>
          {/* Native Expo Status Bar */}
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={colors.bg}
          />

          {/* Screen Content */}
          <View style={styles.screenContent}>{renderActiveScreen()}</View>

          {/* Bottom Nav Bar - Only on main tabs */}
          {['home', 'mywork', 'calendar', 'notifications', 'projects', 'workspaces'].includes(currentScreen) && (
            <BottomNavBar
              currentScreen={currentScreen}
              onNavigate={navigateTo}
              onFabPress={() => navigateTo('create-project')}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeader: {
    width: '100%',
    maxWidth: 1100,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  previewHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  previewSub: {
    fontSize: 12,
  },
  screenSelector: {
    flexDirection: 'row',
  },
  screenSelectorContent: {
    gap: 7,
    paddingBottom: 4,
  },
  selectorBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  selectorBtnText: {
    fontSize: 11,
  },
  selectorBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  phoneFrame: {
    width: 390,
    height: 780,
    maxWidth: '100%',
    maxHeight: '100%',
    borderWidth: Platform.OS === 'web' ? 6 : 0,
    borderRadius: Platform.OS === 'web' ? 40 : 0,
    padding: Platform.OS === 'web' ? 7 : 0,
    marginVertical: Platform.OS === 'web' ? 10 : 0,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: Platform.OS === 'web' ? 29 : 0,
    overflow: 'hidden',
    position: 'relative',
  },
  screenContent: {
    flex: 1,
    position: 'relative',
  },
});
