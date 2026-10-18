import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/authContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { AccessDenied } from './components/common/AccessDenied';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { SubjectProgressDashboard } from './components/progress/SubjectProgressDashboard';
import { FacultyDashboard } from './components/faculty/FacultyDashboard';
import { LessonPlanManagement } from './components/lessonPlan/LessonPlanManagement';
import { CalendarTimetable } from './components/calendar/CalendarTimetable';
import { ExamReadinessDashboard } from './components/exams/ExamReadinessDashboard';
import { StudentPortal } from './components/student/StudentPortal';
import { CampusManagerDashboard } from './components/campusManager/CampusManagerDashboard';
import { AdminManagement } from './components/admin/AdminManagement';
import { UserRole } from './types';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C1917] font-sans selection:bg-[#FBE69B]/60 selection:text-[#1C1917] antialiased p-2 sm:p-3 lg:p-4 flex">
      {/* Mobile drawer backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-xs"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Floating Dark Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Workspace Container */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#FDFBF7] rounded-[28px] border border-[#EFE8DC] shadow-[0_4px_24px_rgba(28,25,23,0.03)] overflow-hidden lg:ml-4">
        <Navbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        <main className="flex-1 min-w-0 w-full px-4 sm:px-6 lg:px-7 py-4 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

// Route protection component checking role authorization
export const RequireRole: React.FC<{
  allowedRoles: UserRole[];
  requiredLabel: string;
  children: React.ReactNode;
}> = ({ allowedRoles, requiredLabel, children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(currentUser.role)) {
    return <AccessDenied requiredRole={requiredLabel} />;
  }
  return <>{children}</>;
};

// Home router: Redirects authenticated users to their designated role dashboard
export const RoleHomeRedirect: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  switch (currentUser.role) {
    case 'student':
      return <Navigate to="/student" replace />;
    case 'faculty':
      return <Navigate to="/faculty" replace />;
    case 'campus_manager':
      return <Navigate to="/campus-manager" replace />;
    case 'admin':
      return <MainDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <RoleHomeRedirect /> : <LoginPage />}
      />

      {/* Protected Routes inside AppLayout */}
      <Route
        path="/"
        element={
          currentUser ? (
            <AppLayout>
              <RoleHomeRedirect />
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/student"
        element={
          currentUser ? (
            <AppLayout>
              <RequireRole allowedRoles={['student', 'admin']} requiredLabel="Student Portal">
                <StudentPortal />
              </RequireRole>
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/faculty"
        element={
          currentUser ? (
            <AppLayout>
              <RequireRole allowedRoles={['faculty', 'campus_manager', 'admin']} requiredLabel="Faculty Dashboard">
                <FacultyDashboard />
              </RequireRole>
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/lesson-plan"
        element={
          currentUser ? (
            <AppLayout>
              <RequireRole allowedRoles={['student', 'faculty', 'campus_manager', 'admin']} requiredLabel="Learning Library">
                <LessonPlanManagement />
              </RequireRole>
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/calendar"
        element={
          currentUser ? (
            <AppLayout>
              <RequireRole allowedRoles={['faculty', 'campus_manager', 'admin']} requiredLabel="Schedule">
                <CalendarTimetable />
              </RequireRole>
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/progress"
        element={
          currentUser ? (
            <AppLayout>
              <RequireRole allowedRoles={['campus_manager', 'faculty', 'admin']} requiredLabel="Course Progression">
                <SubjectProgressDashboard />
              </RequireRole>
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/campus-manager"
        element={
          currentUser ? (
            <AppLayout>
              <RequireRole allowedRoles={['campus_manager', 'admin']} requiredLabel="Campus Manager Dashboard">
                <CampusManagerDashboard />
              </RequireRole>
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/admin"
        element={
          currentUser ? (
            <AppLayout>
              <RequireRole allowedRoles={['admin']} requiredLabel="Global Administrator">
                <AdminManagement />
              </RequireRole>
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/exams"
        element={
          currentUser ? (
            <AppLayout>
              <ExamReadinessDashboard />
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
