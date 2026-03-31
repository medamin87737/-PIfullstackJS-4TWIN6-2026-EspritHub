import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { AccessibilityProvider } from './context/AccessibilityContext'
import AccessibilityWidget from './components/shared/AccessibilityWidget'
import AppLoader from './components/shared/AppLoader'
import RealtimeNotifications from './components/shared/RealtimeNotifications'
import { Toaster } from '@/components/ui/toaster'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './pages/LoginPage'
import GoogleAuthCallback from './pages/GoogleAuthCallback'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminDepartments from './pages/admin/AdminDepartments'
import AdminSkills from './pages/admin/AdminSkills'
import AdminQuestions from './pages/admin/AdminQuestions'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import PromptRewriter from './pages/shared/PromptRewriter'

// HR pages
import HRDashboard from './pages/hr/HRDashboard'
import HRActivities from './pages/hr/HRActivities'
import CreateActivity from './pages/hr/CreateActivity'
import HRActivityChatCreator from './pages/hr/HRActivityChatCreator'
import HRRecommendations from './pages/hr/HRRecommendations'
import HRHistory from './pages/hr/HRHistory'
import HRAnalytics from './pages/hr/HRAnalytics'
import HRImportEmployees from './pages/hr/HRImportEmployees'
import HRActivityRequests from './pages/hr/HRActivityRequests'
import HRReports from './pages/hr/HRReports'

// Manager pages
import ManagerDashboard from './pages/manager/ManagerDashboard'
import ManagerActivities from './pages/manager/ManagerActivities'
import ManagerActivityDetail from './pages/manager/ManagerActivityDetail'
import ManagerValidations from './pages/manager/ManagerValidations'
import ManagerHistory from './pages/manager/ManagerHistory'
import ManagerActivityRequests from './pages/manager/ManagerActivityRequests'

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import EmployeeActivities from './pages/employee/EmployeeActivities'
import EmployeeNotifications from './pages/employee/EmployeeNotifications'
import EmployeeHistory from './pages/employee/EmployeeHistory'
import EmployeeProfile from './pages/employee/EmployeeProfile'
import EmployeeSkillUpdates from './pages/employee/EmployeeSkillUpdates'
import EmployeeCertificates from './pages/employee/EmployeeCertificates'
import { initGlobalAnimations } from './initAnimations'

function RouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return <div key={location.pathname} className="route-fade-in">{children}</div>
}

function RouteProgress() {
  const location = useLocation()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(true)
    const timer = setTimeout(() => setActive(false), 650)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div className={`route-progress ${active ? 'is-active' : ''}`} aria-hidden="true">
      <span className="route-progress-bar" />
    </div>
  )
}

function AnimationBootstrap() {
  const location = useLocation()

  useEffect(() => {
    const id = window.setTimeout(() => {
      initGlobalAnimations()
    }, 0)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  return null
}

export default function App() {
  const [isBootLoading, setIsBootLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsBootLoading(false), 1300)
    return () => clearTimeout(timer)
  }, [])

  if (isBootLoading) {
    return <AppLoader />
  }

  return (
    <BrowserRouter>
      <AccessibilityProvider>
        <AuthProvider>
          <DataProvider>
            <AnimationBootstrap />
              <RouteProgress />
              <RealtimeNotifications />
              <RouteTransition>
                <Routes>
                  {/* Public */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
                  <Route path="/" element={<Navigate to="/login" replace />} />

                  {/* Admin routes */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/departments" element={<AdminDepartments />} />
                    <Route path="/admin/skills" element={<AdminSkills />} />
                    <Route path="/admin/questions" element={<AdminQuestions />} />
                    <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    <Route path="/admin/prompt-rewriter" element={<PromptRewriter />} />
                  </Route>

                  {/* HR routes (accessible to HR and ADMIN) */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['HR', 'ADMIN']}>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/hr/dashboard" element={<HRDashboard />} />
                    <Route path="/hr/activities" element={<HRActivities />} />
                    <Route path="/hr/reports" element={<HRReports />} />
                    <Route path="/hr/create-activity" element={<CreateActivity />} />
                    <Route path="/hr/create-activity-chat" element={<HRActivityChatCreator />} />
                    <Route path="/hr/recommendations/:activityId" element={<HRRecommendations />} />
                    <Route path="/hr/import-employees" element={<HRImportEmployees />} />
                    <Route path="/hr/activity-requests" element={<HRActivityRequests />} />
                    <Route path="/hr/history" element={<HRHistory />} />
                    <Route path="/hr/analytics" element={<HRAnalytics />} />
                    <Route path="/hr/prompt-rewriter" element={<PromptRewriter />} />
                  </Route>

                  {/* Manager routes (accessible to MANAGER and ADMIN) */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                    <Route path="/manager/activities" element={<ManagerActivities />} />
                    <Route path="/manager/activity/:id" element={<ManagerActivityDetail />} />
                    <Route path="/manager/validations" element={<ManagerValidations />} />
                    <Route path="/manager/activity-requests" element={<ManagerActivityRequests />} />
                    <Route path="/manager/history" element={<ManagerHistory />} />
                  </Route>

                  {/* Employee routes (accessible to EMPLOYEE and ADMIN) */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                    <Route path="/employee/activities" element={<EmployeeActivities />} />
                    <Route path="/employee/notifications" element={<EmployeeNotifications />} />
                    <Route path="/employee/certificates" element={<EmployeeCertificates />} />
                    <Route path="/employee/history" element={<EmployeeHistory />} />
                    <Route path="/employee/skill-updates" element={<EmployeeSkillUpdates />} />
                    <Route path="/employee/profile" element={<EmployeeProfile />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </RouteTransition>
            <Toaster />
            <AccessibilityWidget />
          </DataProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  )
}
