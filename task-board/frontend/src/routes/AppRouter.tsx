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
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId/boards/:boardId" element={<BoardPage />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId" element={<ProjectPage />} />
            <Route path="/workspaces/:workspaceId/activity" element={<ActivityPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/workspaces/:workspaceId" element={<Home />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};