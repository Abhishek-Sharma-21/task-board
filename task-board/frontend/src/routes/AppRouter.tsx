import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { Home } from '../pages/Home';
import { BoardPage } from '../features/boards/BoardPage';
import { ProjectPage } from '../features/projects/ProjectPage';
import { ActivityPage } from '../pages/ActivityPage';
import { WorkflowPage } from '../pages/WorkflowPage';
import { WorkspaceSettingsPage } from '../pages/WorkspaceSettingsPage';
import { MyWorkPage } from '../pages/MyWorkPage';
import { CalendarPage } from '../pages/CalendarPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { JoinWorkspacePage } from '../pages/JoinWorkspacePage';

const NotFound: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>404</h1>
    <p>Page not found</p>
    <a href="/" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Go home</a>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join-workspace" element={<JoinWorkspacePage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="/my-work" element={<MyWorkPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId/boards/:boardId" element={<BoardPage />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId" element={<ProjectPage />} />
            <Route path="/workspaces/:workspaceId/activity" element={<ActivityPage />} />
            <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/workspaces" element={<Home />} />
            <Route path="/workspaces/:workspaceId" element={<Home />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};